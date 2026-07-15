"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const initialStudents = [
  { id: 1234, name: "Annas", class: "7A", nis: "1234" },
  { id: 2345, name: "Ilma", class: "7A", nis: "2345" },
  { id: 3456, name: "Purwo", class: "7B", nis: "3456" },
  { id: 4567, name: "Karin", class: "7B", nis: "4567" },
  { id: 5678, name: "Soleh", class: "7C", nis: "5678" },
  { id: 6789, name: "Rido", class: "7D", nis: "6789" }
];

function SiswaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kelasParam = searchParams.get("kelas");

  // Lazy initialize state from localStorage
  const [students, setStudents] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("daftar_siswa");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {
          console.error("Failed to parse stored students", e);
        }
      }
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("Semua Kelas");
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modal States for Student Delete
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

  // Modal States for Student Edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({
    name: "",
    nis: "",
    class: "7A"
  });

  // Toast Alerts
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Helper: Fetch students from sheet
  const fetchSiswaFromSheet = useCallback(async (showSuccessToast = false) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/siswa");
      if (!res.ok) throw new Error("Failed to fetch students from Apps Script");
      const result = await res.json();
      if (result.data) {
        const mapped = result.data.map((item) => ({
          id: item.ID || item._rowNum,
          name: item["Nama Siswa"] || "",
          class: item["Kelas"] || "",
          nis: item.ID ? item.ID.toString() : "",
          _rowNum: item._rowNum
        }));
        localStorage.setItem("daftar_siswa", JSON.stringify(mapped));
        setStudents(mapped);
        if (showSuccessToast) {
          showToast("Data siswa berhasil diperbarui dari Google Sheet!");
        }
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      showToast("Gagal memuat data dari Google Sheet. Menggunakan data lokal.", "error");
      
      // Seed with initial students if localStorage is empty
      const stored = localStorage.getItem("daftar_siswa");
      if (!stored) {
        localStorage.setItem("daftar_siswa", JSON.stringify(initialStudents));
        setStudents(initialStudents);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load students data on mount if empty
  useEffect(() => {
    const timer = setTimeout(() => {
      if (students.length === 0) {
        fetchSiswaFromSheet();
      } else {
        setIsLoading(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [students.length, fetchSiswaFromSheet]);

  // Update selected filter from URL parameter asynchronously
  useEffect(() => {
    if (kelasParam) {
      const timer = setTimeout(() => {
        setSelectedClassFilter(kelasParam);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [kelasParam]);

  // Extract unique classes dynamically
  const activeStudents = students.filter((s) => !s.isDeleted);
  const availableClasses = ["Semua Kelas", ...new Set(activeStudents.map((s) => s.class).filter(Boolean))].sort();

  // Determine active class filter dynamically
  const activeClassFilter = (selectedClassFilter !== "Semua Kelas" && availableClasses.includes(selectedClassFilter))
    ? selectedClassFilter
    : "Semua Kelas";

  // Filter students on the fly during render
  const filteredStudents = activeStudents.filter((student) => {
    // 1. Search Query Filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const matchesSearch = student.name.toLowerCase().includes(query) || (student.nis && student.nis.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }
    // 2. Class Filter
    if (activeClassFilter !== "Semua Kelas" && student.class !== activeClassFilter) {
      return false;
    }
    return true;
  });

  // Open Delete Confirmation Modal
  const openDeleteModal = (student) => {
    setStudentToDelete(student);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setStudentToDelete(null);
  };

  const confirmDelete = () => {
    if (!studentToDelete) return;
    let updated;
    if (studentToDelete.isNew) {
      updated = students.filter((s) => s.id !== studentToDelete.id);
    } else {
      updated = students.map((s) =>
        s.id === studentToDelete.id ? { ...s, isDeleted: true } : s
      );
    }
    setStudents(updated);
    localStorage.setItem("daftar_siswa", JSON.stringify(updated));
    showToast("Siswa berhasil dihapus secara lokal!", "success");
    setIsDeleteModalOpen(false);
    setStudentToDelete(null);
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setStudentForm({
      name: student.name,
      nis: student.nis || "",
      class: student.class
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedStudent(null);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!studentForm.name) {
      showToast("Nama Lengkap wajib diisi!", "error");
      return;
    }
    const updated = students.map((s) => {
      if (s.id === selectedStudent.id) {
        const isNew = s.isNew;
        return {
          ...s,
          ...studentForm,
          isUpdated: !isNew ? true : undefined
        };
      }
      return s;
    });
    setStudents(updated);
    localStorage.setItem("daftar_siswa", JSON.stringify(updated));
    showToast("Data siswa berhasil diperbarui secara lokal!");
    closeEditModal();
  };

  // Sync handler
  const handleSync = async () => {
    setIsSyncing(true);
    showToast("Memulai sinkronisasi...", "info");
    try {
      // 1. Sync deletions (bottom-to-top by descending _rowNum)
      const toDelete = students.filter((s) => s.isDeleted && s._rowNum);
      toDelete.sort((a, b) => b._rowNum - a._rowNum);
      for (const student of toDelete) {
        const res = await fetch(`/api/siswa?id=${student._rowNum}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(`Gagal menghapus siswa ${student.name}`);
      }

      // 2. Sync updates
      const toUpdate = students.filter((s) => s.isUpdated && s._rowNum);
      for (const student of toUpdate) {
        const res = await fetch("/api/siswa", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: student._rowNum,
            data: {
              "ID": student.nis || student.id.toString(),
              "Nama Siswa": student.name,
              "Kelas": student.class,
            },
          }),
        });
        if (!res.ok) throw new Error(`Gagal memperbarui siswa ${student.name}`);
      }

      // 3. Sync additions
      const toAdd = students.filter((s) => s.isNew);
      for (const student of toAdd) {
        const res = await fetch("/api/siswa", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            "ID": student.nis || student.id.toString(),
            "Nama Siswa": student.name,
            "Kelas": student.class,
          }),
        });
        if (!res.ok) throw new Error(`Gagal menambahkan siswa ${student.name}`);
      }

      // 4. Reload all students from sheet to reset row numbers and clean sync states
      await fetchSiswaFromSheet(true);
    } catch (error) {
      console.error("Sync error:", error);
      showToast(`Sinkronisasi gagal: ${error.message}`, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const unsyncedCount = students.filter((s) => s.isNew || s.isUpdated || s.isDeleted).length;
  const hasUnsynced = unsyncedCount > 0;

  return (
    <>
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-md border animate-fade-in ${
            toast.type === "error"
              ? "bg-error text-on-error border-transparent"
              : toast.type === "info"
              ? "bg-secondary-container text-on-secondary-container border-transparent"
              : "bg-inverse-surface text-inverse-on-surface border-transparent"
          }`}
        >
          <span className="font-body-md text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Main Canvas */}
      <main className="w-full max-w-7xl px-container-margin py-md flex-grow mx-auto">
        
        {/* Header & Search */}
        <div className="mb-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-display text-display text-on-surface mb-2">Daftar Siswa</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Kelola data siswa, NIS, dan kelas secara lokal dengan sinkronisasi Google Sheets.</p>
          </div>
          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-surface border border-outline rounded-full font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-on-surface-variant"
              placeholder="Cari nama atau NIS..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 hide-scrollbar">
          {availableClasses.map((classFilter) => (
            <button
              key={classFilter}
              onClick={() => setSelectedClassFilter(classFilter)}
              className={`font-label-caps text-label-caps px-4 py-2 rounded-full whitespace-nowrap transition-colors border ${
                activeClassFilter === classFilter
                  ? "bg-primary text-on-primary border-transparent"
                  : "bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container-high"
              }`}
            >
              {classFilter === "Semua Kelas" ? classFilter : `Kelas ${classFilter}`}
            </button>
          ))}
        </div>

        {/* Student List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-xl gap-md text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] animate-spin text-primary">sync</span>
            <p className="font-body-lg text-body-lg">Memuat data siswa...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-surface border border-outline-variant rounded-lg p-xl text-center flex flex-col items-center gap-md">
            <span className="material-symbols-outlined text-[64px] text-on-surface-variant">group_off</span>
            <div>
              <h3 className="font-h2 text-h2 text-on-surface">Tidak Ada Siswa</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-sm max-w-sm">
                {searchQuery || activeClassFilter !== "Semua Kelas"
                  ? "Tidak ditemukan siswa yang cocok dengan filter atau kata kunci Anda."
                  : "Tambahkan siswa ke dalam kelas untuk mulai mengelola jurnal dan absensi."}
              </p>
            </div>
            {!searchQuery && activeClassFilter === "Semua Kelas" && (
              <Link
                href="/siswa/tambah-siswa"
                className="bg-primary text-on-primary font-label-caps text-label-caps px-4 py-2 rounded shadow-sm hover:bg-primary/90 transition-colors"
              >
                Tambah Siswa Pertama
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 font-body-md text-body-md">
            {filteredStudents.map((student) => {
              const initialLetter = student.name ? student.name.charAt(0).toUpperCase() : "?";
              let avatarBg = "bg-secondary-container text-on-secondary-container";
              if (student.id % 3 === 0) {
                avatarBg = "bg-primary-container text-on-primary-container";
              } else if (student.id % 2 === 0) {
                avatarBg = "bg-tertiary-container text-on-tertiary-container";
              }

              return (
                <div
                  key={student.id}
                  className="bg-surface border border-outline-variant hover:border-primary p-4 rounded-xl flex items-center justify-between transition-colors cursor-pointer animate-fade-in"
                  onClick={() => openEditModal(student)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-h3 text-h3 ${avatarBg}`}
                    >
                      {initialLetter}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-h3 text-h3 text-on-surface">{student.name}</h3>
                        {student.isNew && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">Lokal</span>
                        )}
                        {student.isUpdated && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Diedit</span>
                        )}
                      </div>
                      <div className="flex gap-3 text-on-surface-variant font-caption text-caption mt-1">
                        {student.nis && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">badge</span> {student.nis}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">class</span> Kelas {student.class}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      aria-label="Edit"
                      onClick={() => openEditModal(student)}
                      className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container-low"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      aria-label="Delete"
                      onClick={() => openDeleteModal(student)}
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

      {/* Floating Action & Sync Buttons Container */}
      <div className="fixed bottom-24 right-container-margin md:bottom-8 md:right-8 flex flex-col items-center gap-3 z-40 animate-fade-in">
        {/* Sync Button */}
        {hasUnsynced && (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="w-12 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 active:scale-95 relative animate-bounce"
            title={`Sinkronisasi ${unsyncedCount} perubahan ke Google Sheets`}
          >
            {isSyncing ? (
              <span className="material-symbols-outlined text-[24px] animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
            )}
            <span className="absolute -top-1 -right-1 bg-error text-on-error text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {unsyncedCount}
            </span>
          </button>
        )}

        {/* Add Student FAB */}
        <Link
          href="/siswa/tambah-siswa"
          aria-label="Tambah Siswa"
          className="w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-[0_8px_16px_rgba(30,64,175,0.25)] flex items-center justify-center hover:bg-primary/95 transition-all duration-300 active:scale-95"
        >
          <span className="material-symbols-outlined text-[28px]">add</span>
        </Link>
      </div>

      {/* Reusable Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-surface w-[95%] sm:w-full max-w-2xl rounded-xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-h2 text-h2 text-on-surface font-semibold">Hapus Data Siswa</h2>
              <button
                onClick={closeDeleteModal}
                className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                aria-label="Close modal"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto font-body-md text-body-md text-on-surface">
              <p className="font-body-lg text-body-lg font-semibold">
                Apakah Anda yakin ingin menghapus siswa?
              </p>
              {studentToDelete && (
                <p className="font-body-md text-body-md text-on-surface-variant mt-2">
                  Tindakan ini akan menghapus data siswa bernama <strong className="text-on-surface">{studentToDelete.name}</strong> secara permanen {studentToDelete.isNew ? "dari penyimpanan lokal" : "pada sinkronisasi berikutnya"}.
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-end gap-sm">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 border border-outline text-on-surface hover:bg-surface-container-high rounded font-label-caps text-label-caps transition-colors active:scale-95 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-error text-on-error rounded font-label-caps text-label-caps shadow-sm hover:bg-error/95 transition-colors active:scale-95 flex items-center gap-xs cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-surface w-[95%] sm:w-full max-w-2xl rounded-xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-h2 text-h2 text-on-surface font-semibold">Edit Data Siswa</h2>
              <button
                onClick={closeEditModal}
                className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                aria-label="Close modal"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto font-body-md text-body-md text-on-surface-variant">
              <form id="editStudentForm" onSubmit={handleEditSubmit} className="space-y-4">
                {/* Nama Lengkap */}
                <div className="flex flex-col gap-xs">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">
                    Nama Lengkap <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ahmad Fauzi"
                    value={studentForm.name}
                    onChange={(e) =>
                      setStudentForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md"
                  />
                </div>

                {/* NIS */}
                <div className="flex flex-col gap-xs">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">
                    NIS (Nomor Induk Siswa)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 102938"
                    value={studentForm.nis}
                    onChange={(e) =>
                      setStudentForm((prev) => ({ ...prev, nis: e.target.value }))
                    }
                    className="w-full bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md"
                  />
                </div>

                {/* Kelas Selection */}
                <div className="flex flex-col gap-xs">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">
                    Kelas <span className="text-error">*</span>
                  </label>
                  <select
                    required
                    value={studentForm.class}
                    onChange={(e) =>
                      setStudentForm((prev) => ({ ...prev, class: e.target.value }))
                    }
                    className="w-full bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md"
                  >
                    <option value="7A">Kelas 7A</option>
                    <option value="7B">Kelas 7B</option>
                    <option value="7C">Kelas 7C</option>
                    <option value="7D">Kelas 7D</option>
                    <option value="8A">Kelas 8A</option>
                    <option value="8B">Kelas 8B</option>
                    <option value="8C">Kelas 8C</option>
                    <option value="9A">Kelas 9A</option>
                    <option value="9B">Kelas 9B</option>
                    <option value="X-A">Kelas X - A</option>
                    <option value="X-B">Kelas X - B</option>
                    <option value="XI-A">Kelas XI - A</option>
                    <option value="XI-B">Kelas XI - B</option>
                    <option value="XII-A">Kelas XII - A</option>
                    <option value="XII-B">Kelas XII - B</option>
                  </select>
                </div>
              </form>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-end gap-sm">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 border border-outline text-on-surface hover:bg-surface-container-high rounded font-label-caps text-label-caps transition-colors active:scale-95 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                form="editStudentForm"
                className="px-4 py-2 bg-primary text-on-primary rounded font-label-caps text-label-caps shadow-sm hover:bg-primary/95 transition-colors active:scale-95 cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function SiswaPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen gap-md text-on-surface-variant">
        <span className="material-symbols-outlined text-[48px] animate-spin text-primary">sync</span>
        <p className="font-body-lg text-body-lg">Memuat halaman siswa...</p>
      </div>
    }>
      <SiswaContent />
    </Suspense>
  );
}
