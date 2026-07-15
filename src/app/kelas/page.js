"use client";

import { useState, useEffect } from "react";
import Link from "next/link";


const initialClasses = [
  { id: 1, code: "7A", name: "Kelas VII A", type: "IPA", studentCount: 32 },
  { id: 2, code: "8C", name: "Kelas VIII C", type: "IPS", studentCount: 30 },
  { id: 3, code: "9B", name: "Kelas IX B", type: "BHS", studentCount: 28 }
];

export default function KelasPage() {
  const [classes, setClasses] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Modal states for CRUD classes
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classForm, setClassForm] = useState({
    code: "",
    name: "",
    type: "IPA",
    studentCount: 0
  });

  // Toast notifications
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load classes on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setClasses(initialClasses);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Compute filtered classes dynamically on render
  const filteredClasses = classes.filter((c) => {
    if (searchQuery.trim() === "") return true;
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query) ||
      c.type.toLowerCase().includes(query)
    );
  });

  // Create new class
  const openCreateModal = () => {
    setClassForm({
      code: "",
      name: "",
      type: "IPA",
      studentCount: 0
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!classForm.code || !classForm.name) {
      showToast("Kode dan nama kelas wajib diisi!", "error");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const newClass = {
        id: classes.length > 0 ? Math.max(...classes.map(c => c.id)) + 1 : 1,
        code: classForm.code.toUpperCase(),
        name: classForm.name,
        type: classForm.type,
        studentCount: classForm.studentCount || 0
      };
      setClasses((prev) => [...prev, newClass]);
      showToast("Kelas baru berhasil ditambahkan!");
      setIsModalOpen(false);
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <>
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-md border animate-fade-in bg-inverse-surface text-inverse-on-surface border-transparent`}
        >
          <span className="font-body-md text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Main Content Canvas */}
      <main className="flex-grow px-container-margin py-md max-w-7xl mx-auto w-full">
        
        {/* Page Header & Search */}
        <div className="mb-lg flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-display text-primary">Daftar Kelas</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Kelola kelas dan wali kelas tahun ajaran ini. Klik kelas untuk melihat daftar siswa.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-full font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Cari kelas atau jurusan..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Bento Grid for Classes */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-xl gap-md text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] animate-spin text-primary">sync</span>
            <p className="font-body-lg text-body-lg">Memuat data kelas...</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="bg-surface border border-outline-variant rounded-lg p-xl text-center flex flex-col items-center gap-md">
            <span className="material-symbols-outlined text-[64px] text-on-surface-variant">school</span>
            <div>
              <h3 className="font-h2 text-h2 text-on-surface">Tidak Ada Kelas</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-sm max-w-sm">
                {searchQuery
                  ? "Tidak ditemukan kelas yang cocok dengan kata kunci pencarian Anda."
                  : "Belum ada kelas yang terdaftar."}
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={openCreateModal}
                className="bg-primary text-on-primary font-label-caps text-label-caps px-4 py-2 rounded shadow-sm hover:bg-primary/90 transition-colors"
              >
                Tambah Kelas Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {filteredClasses.map((c) => {
              let avatarBg = "bg-primary-container text-on-primary-container";
              if (c.id % 3 === 0) {
                avatarBg = "bg-tertiary-container text-on-tertiary-container";
              } else if (c.id % 2 === 0) {
                avatarBg = "bg-secondary-container text-on-secondary-container";
              }

              return (
                <Link
                  key={c.id}
                  href={`/siswa?kelas=${c.code}`}
                  className="bg-surface rounded-xl border border-outline-variant p-4 hover:border-primary transition-colors cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center font-h2 text-h2 ${avatarBg}`}
                      >
                        {c.code}
                      </div>
                      <span className="bg-surface-container-high text-on-surface font-label-caps text-label-caps px-2 py-1 rounded">
                        {c.type}
                      </span>
                    </div>
                    <h3 className="font-h3 text-h3 text-on-surface mb-1">{c.name}</h3>
                  </div>
                  <div className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2 mt-auto pt-4 border-t border-surface-container-high">
                    <span className="material-symbols-outlined text-[18px]">groups</span>
                    <span>{c.studentCount} Siswa</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={openCreateModal}
        className="fixed bottom-24 md:bottom-8 right-4 md:right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:bg-primary-container hover:shadow-xl transition-all duration-200 z-40 active:scale-95 animate-fade-in"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      {/* CRUD MODAL FORM (Class) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-surface w-[95%] sm:w-full max-w-2xl rounded-xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-h2 text-h2 text-on-surface font-semibold">Tambah Kelas Baru</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                aria-label="Close modal"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto font-body-md text-body-md text-on-surface-variant">
              <form id="kelasForm" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kode Kelas */}
                  <div className="flex flex-col gap-xs">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">
                      Kode Kelas <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 7A, 8C, atau 9B"
                      value={classForm.code}
                      onChange={(e) =>
                        setClassForm((prev) => ({ ...prev, code: e.target.value }))
                      }
                      className="w-full bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md"
                    />
                  </div>

                  {/* Nama Kelas */}
                  <div className="flex flex-col gap-xs">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">
                      Nama Panjang Kelas <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kelas VII A"
                      value={classForm.name}
                      onChange={(e) =>
                        setClassForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md"
                    />
                  </div>

                  {/* Jurusan / Tipe Kelas */}
                  <div className="flex flex-col gap-xs">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">
                      Jurusan / Peminatan <span className="text-error">*</span>
                    </label>
                    <select
                      required
                      value={classForm.type}
                      onChange={(e) =>
                        setClassForm((prev) => ({ ...prev, type: e.target.value }))
                      }
                      className="w-full bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md"
                    >
                      <option value="IPA">IPA (Ilmu Pengetahuan Alam)</option>
                      <option value="IPS">IPS (Ilmu Pengetahuan Sosial)</option>
                      <option value="BHS">BHS (Bahasa)</option>
                      <option value="UMUM">UMUM / Lainnya</option>
                    </select>
                  </div>

                  {/* Jumlah Siswa */}
                  <div className="flex flex-col gap-xs">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">
                      Jumlah Siswa Awal
                    </label>
                    <input
                      type="number"
                      placeholder="Contoh: 32"
                      value={classForm.studentCount || ""}
                      onChange={(e) =>
                        setClassForm((prev) => ({ ...prev, studentCount: parseInt(e.target.value) || 0 }))
                      }
                      className="w-full bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-end gap-sm">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-outline text-on-surface hover:bg-surface-container-high rounded font-label-caps text-label-caps transition-colors cursor-pointer"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="submit"
                form="kelasForm"
                className="px-4 py-2 bg-primary text-on-primary rounded font-label-caps text-label-caps shadow-sm hover:bg-primary/95 transition-colors flex items-center gap-xs cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                )}
                Tambah Kelas
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
