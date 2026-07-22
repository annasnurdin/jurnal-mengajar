"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";

function MateriPokokContent() {
  const [materiList, setMateriList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingIds, setSyncingIds] = useState({});

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedMateri, setSelectedMateri] = useState(null);
  const [materiToDelete, setMateriToDelete] = useState(null);

  const [materiForm, setMateriForm] = useState({ name: "" });

  // Toast alert
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const fetchMateri = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/materi-pokok");
      if (!res.ok) throw new Error("Gagal mengambil data materi pokok");
      const result = await res.json();
      if (result.data) {
        const mapped = result.data.map((item) => ({
          id: item.ID || item._rowNum,
          name: item["Materi Pokok"] || "",
          _rowNum: item._rowNum,
          synced: true
        }));
        setMateriList(mapped);
        localStorage.setItem("daftar_materi_pokok", JSON.stringify(mapped));
      }
    } catch (e) {
      console.error(e);
      showToast("Gagal memuat data dari Google Sheet.", "error");
      const stored = localStorage.getItem("daftar_materi_pokok");
      if (stored) {
        setMateriList(JSON.parse(stored));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("daftar_materi_pokok");
    if (stored !== null) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const timer = setTimeout(() => {
            setMateriList(parsed);
            setIsLoading(false);
          }, 0);
          return () => clearTimeout(timer);
        }
      } catch (e) {
        console.error(e);
      }
    }

    const timer = setTimeout(() => {
      fetchMateri();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchMateri]);

  // Filters
  const filteredMateri = materiList.filter((item) => {
    if (searchQuery.trim() === "") return true;
    return item.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const openAddModal = () => {
    setMateriForm({ name: "" });
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!materiForm.name.trim()) {
      showToast("Nama materi pokok tidak boleh kosong", "error");
      return;
    }

    const uuid = typeof window !== "undefined" && window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newLocalItem = {
      id: uuid,
      name: materiForm.name.trim(),
      synced: false,
      isNew: true,
      _rowNum: null
    };

    const updated = [newLocalItem, ...materiList];
    setMateriList(updated);
    localStorage.setItem("daftar_materi_pokok", JSON.stringify(updated));

    showToast("Materi pokok berhasil ditambahkan secara lokal!");
    setIsAddModalOpen(false);
  };

  const handleSyncItem = async (item) => {
    if (syncingIds[item.id]) return;

    setSyncingIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      let res;
      if (item.isNew) {
        res = await fetch("/api/materi-pokok", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            "ID": item.id,
            "Materi Pokok": item.name
          })
        });
      } else {
        res = await fetch("/api/materi-pokok", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            data: {
              "Materi Pokok": item.name
            }
          })
        });
      }

      if (!res.ok) throw new Error("Gagal menyinkronkan materi pokok");
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      showToast("Berhasil disinkronkan ke Google Sheet!");
      
      const updated = materiList.map((m) =>
        m.id === item.id ? { ...m, synced: true, isNew: false } : m
      );
      setMateriList(updated);
      localStorage.setItem("daftar_materi_pokok", JSON.stringify(updated));
    } catch (error) {
      console.error(error);
      showToast("Gagal menyinkronkan ke Google Sheet.", "error");
    } finally {
      setSyncingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const openEditModal = (item) => {
    setSelectedMateri(item);
    setMateriForm({ name: item.name });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!materiForm.name.trim()) {
      showToast("Nama materi pokok tidak boleh kosong", "error");
      return;
    }

    const updated = materiList.map((m) =>
      m.id === selectedMateri.id
        ? { ...m, name: materiForm.name.trim(), synced: false }
        : m
    );
    setMateriList(updated);
    localStorage.setItem("daftar_materi_pokok", JSON.stringify(updated));
    showToast("Materi pokok berhasil diperbarui secara lokal!");
    setIsEditModalOpen(false);
  };

  const openDeleteModal = (item, e) => {
    e.stopPropagation();
    setMateriToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!materiToDelete) return;

    if (!materiToDelete.synced) {
      const updated = materiList.filter((m) => m.id !== materiToDelete.id);
      setMateriList(updated);
      localStorage.setItem("daftar_materi_pokok", JSON.stringify(updated));
      showToast("Materi pokok berhasil dihapus secara lokal!");
      setIsDeleteModalOpen(false);
      setMateriToDelete(null);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/materi-pokok?id=${materiToDelete.id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Gagal menghapus materi pokok");
      showToast("Materi pokok berhasil dihapus!");
      setIsDeleteModalOpen(false);
      
      const updated = materiList.filter((m) => m.id !== materiToDelete.id);
      setMateriList(updated);
      localStorage.setItem("daftar_materi_pokok", JSON.stringify(updated));
    } catch (error) {
      console.error(error);
      showToast("Gagal menghapus dari Google Sheet.", "error");
    } finally {
      setIsSubmitting(false);
      setMateriToDelete(null);
    }
  };

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-md border animate-fade-in ${
            toast.type === "error"
              ? "bg-error text-on-error border-transparent"
              : "bg-inverse-surface text-inverse-on-surface border-transparent"
          }`}
        >
          <span className="font-body-md text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Main Canvas */}
      <main className="w-full max-w-7xl px-container-margin py-md flex-grow mx-auto">
        {/* Header & Search */}
        <div className="mb-lg text-center flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-display text-display text-primary">Manajemen Materi Pokok</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Materi Pokok disini digunakan untuk mengisi dropdown saat tambah Jurnal
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-surface border border-outline rounded-full font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-on-surface-variant"
              placeholder="Cari materi pokok..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* List Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-xl gap-md text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] animate-spin text-primary">sync</span>
            <p className="font-body-lg text-body-lg">Memuat materi pokok...</p>
          </div>
        ) : filteredMateri.length === 0 ? (
          <div className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-primary text-[32px] mt-1">menu_book</span>
              <div>
                <h3 className="font-h3 text-h3 font-semibold text-on-surface">Tidak Ada Materi Pokok</h3>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  {searchQuery
                    ? "Tidak ditemukan materi pokok yang cocok dengan kata kunci pencarian Anda."
                    : "Belum ada materi pokok yang terdaftar. Tambahkan materi pokok untuk mempermudah pengisian jurnal mengajar."}
                </p>
              </div>
            </div>
            {!searchQuery && (
              <button
                onClick={openAddModal}
                className="bg-primary text-on-primary font-label-caps text-label-caps px-4 py-2.5 rounded-lg shadow-sm hover:bg-primary/95 transition-all flex items-center gap-xs cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Tambah Materi Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 font-body-md text-body-md">
            {filteredMateri.map((item, idx) => {
              const letter = item.name ? item.name.charAt(0).toUpperCase() : "?";
              let avatarBg = "bg-primary-container text-on-primary-container";
              if (idx % 3 === 1) {
                avatarBg = "bg-secondary-container text-on-secondary-container";
              } else if (idx % 3 === 2) {
                avatarBg = "bg-tertiary-container text-on-tertiary-container";
              }

              return (
                <div
                  key={item.id}
                  className="bg-surface border border-outline-variant hover:border-primary p-4 rounded-xl flex items-center justify-between transition-colors cursor-pointer animate-fade-in"
                  onClick={() => openEditModal(item)}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-grow mr-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-h3 text-h3 flex-shrink-0 ${avatarBg}`}
                    >
                      {letter}
                    </div>
                    <div className="min-w-0 flex-grow flex items-center gap-2 flex-wrap">
                      <h3 className="font-h3 text-h3 text-on-surface truncate" title={item.name}>
                        {item.name}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!item.synced && (
                      <button
                        aria-label="Sync"
                        onClick={() => handleSyncItem(item)}
                        disabled={syncingIds[item.id]}
                        className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors rounded-full flex items-center justify-center"
                      >
                        {syncingIds[item.id] ? (
                          <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
                        ) : (
                          <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                        )}
                      </button>
                    )}
                    <button
                      aria-label="Edit"
                      onClick={() => openEditModal(item)}
                      className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container-low"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      aria-label="Delete"
                      onClick={(e) => openDeleteModal(item, e)}
                      className="p-2 text-on-surface-variant hover:text-error transition-colors rounded-full hover:bg-error-container"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={openAddModal}
        className="fixed bottom-[92px] md:bottom-8 right-container-margin md:right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:bg-primary-container hover:shadow-xl transition-all duration-200 z-40 active:scale-95 animate-fade-in"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      {/* ADD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-surface w-[95%] sm:w-full max-w-2xl rounded-xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-h2 text-h2 text-on-surface font-semibold font-bold">Tambah Materi Pokok</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto font-body-md text-body-md text-on-surface-variant">
              <form id="addMateriForm" onSubmit={handleAddSubmit} className="space-y-4">
                <div className="flex flex-col gap-xs">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">
                    Nama Materi Pokok <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Integral Lipat Dua, Persamaan Kuadrat"
                    value={materiForm.name}
                    onChange={(e) => setMateriForm({ name: e.target.value })}
                    className="w-full bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md"
                  />
                </div>
              </form>
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-end gap-sm">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 border border-outline text-on-surface hover:bg-surface-container-high rounded font-label-caps text-label-caps transition-colors cursor-pointer"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="submit"
                form="addMateriForm"
                className="px-4 py-2 bg-primary text-on-primary rounded font-label-caps text-label-caps shadow-sm hover:bg-primary/95 transition-colors flex items-center gap-xs cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                )}
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-surface w-[95%] sm:w-full max-w-2xl rounded-xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-h2 text-h2 text-on-surface font-semibold font-bold">Edit Materi Pokok</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto font-body-md text-body-md text-on-surface-variant">
              <form id="editMateriForm" onSubmit={handleEditSubmit} className="space-y-4">
                <div className="flex flex-col gap-xs">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">
                    Nama Materi Pokok <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Integral Lipat Dua"
                    value={materiForm.name}
                    onChange={(e) => setMateriForm({ name: e.target.value })}
                    className="w-full bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md"
                  />
                </div>
              </form>
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-end gap-sm">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-outline text-on-surface hover:bg-surface-container-high rounded font-label-caps text-label-caps transition-colors cursor-pointer"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="submit"
                form="editMateriForm"
                className="px-4 py-2 bg-primary text-on-primary rounded font-label-caps text-label-caps shadow-sm hover:bg-primary/95 transition-colors flex items-center gap-xs cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                )}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-surface w-[95%] sm:w-full max-w-2xl rounded-xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-h2 text-h2 text-on-surface font-semibold font-bold">Hapus Materi Pokok</h2>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto font-body-md text-body-md text-on-surface">
              <p className="font-body-lg text-body-lg font-semibold">
                Apakah Anda yakin ingin menghapus materi pokok ini?
              </p>
              {materiToDelete && (
                <p className="font-body-md text-body-md text-on-surface-variant mt-2">
                  Tindakan ini akan menghapus materi pokok <strong className="text-on-surface">{materiToDelete.name}</strong> secara permanen dari Google Sheet.
                </p>
              )}
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-end gap-sm">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-outline text-on-surface hover:bg-surface-container-high rounded font-label-caps text-label-caps transition-colors active:scale-95 cursor-pointer"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-error text-on-error rounded font-label-caps text-label-caps shadow-sm hover:bg-error/95 transition-colors active:scale-95 flex items-center gap-xs cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                )}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function MateriPokokPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen gap-md text-on-surface-variant">
        <span className="material-symbols-outlined text-[48px] animate-spin text-primary">sync</span>
        <p className="font-body-lg text-body-lg">Memuat halaman materi pokok...</p>
      </div>
    }>
      <MateriPokokContent />
    </Suspense>
  );
}
