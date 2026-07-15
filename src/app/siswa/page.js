"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const initialStudents = [
  { id: 1, name: "Ahmad Fauzi", nis: "102938", class: "7A" },
  { id: 2, name: "Budi Darmawan", nis: "102939", class: "7A" },
  { id: 3, name: "Citra Kirana", nis: "102940", class: "8C" }
];

function SiswaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kelasParam = searchParams.get("kelas");

  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("Semua Kelas");
  const [isLoading, setIsLoading] = useState(true);

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

  // Load students dummy data on mount (from localStorage if exists, else initialStudents)
  useEffect(() => {
    const stored = localStorage.getItem("daftar_siswa");
    let currentStudents = initialStudents;
    if (stored) {
      try {
        currentStudents = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored students", e);
      }
    } else {
      localStorage.setItem("daftar_siswa", JSON.stringify(initialStudents));
    }
    const timer = setTimeout(() => {
      setStudents(currentStudents);
      setFilteredStudents(currentStudents);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Update selected filter from URL parameter
  useEffect(() => {
    if (kelasParam) {
      setSelectedClassFilter(kelasParam);
    }
  }, [kelasParam]);

  // Filter and Search trigger
  useEffect(() => {
    let result = students;

    // Search query filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.nis.toLowerCase().includes(query)
      );
    }

    // Class filter
    if (selectedClassFilter !== "Semua Kelas") {
      result = result.filter((s) => s.class === selectedClassFilter);
    }

    setFilteredStudents(result);
  }, [searchQuery, selectedClassFilter, students]);

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
    const updated = students.filter((s) => s.id !== studentToDelete.id);
    setStudents(updated);
    localStorage.setItem("daftar_siswa", JSON.stringify(updated));
    showToast("Siswa berhasil dihapus!", "success");
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
    const updated = students.map((s) =>
      s.id === selectedStudent.id ? { ...s, ...studentForm } : s
    );
    setStudents(updated);
    localStorage.setItem("daftar_siswa", JSON.stringify(updated));
    showToast("Data siswa berhasil diperbarui!");
    closeEditModal();
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

      {/* Main Canvas */}
      <main className="w-full max-w-7xl px-container-margin py-md flex-grow mx-auto">
        
        {/* Header & Search */}
        <div className="mb-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-display text-display text-on-surface mb-2">Daftar Siswa</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Kelola data siswa, NIS, dan kelas secara lokal.</p>
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
          {["Semua Kelas", "7A", "8C", "9B"].map((classFilter) => (
            <button
              key={classFilter}
              onClick={() => setSelectedClassFilter(classFilter)}
              className={`font-label-caps text-label-caps px-4 py-2 rounded-full whitespace-nowrap transition-colors border ${
                selectedClassFilter === classFilter
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
                {searchQuery || selectedClassFilter !== "Semua Kelas"
                  ? "Tidak ditemukan siswa yang cocok dengan filter atau kata kunci Anda."
                  : "Tambahkan siswa ke dalam kelas untuk mulai mengelola jurnal dan absensi."}
              </p>
            </div>
            {!searchQuery && selectedClassFilter === "Semua Kelas" && (
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
                      <h3 className="font-h3 text-h3 text-on-surface">{student.name}</h3>
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

      {/* Floating Action Button (FAB) */}
      <Link
        href="/siswa/tambah-siswa"
        aria-label="Tambah Siswa"
        className="fixed bottom-24 right-container-margin md:bottom-8 md:right-8 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-[0_8px_16px_rgba(30,64,175,0.25)] flex items-center justify-center hover:bg-primary/95 transition-all duration-300 z-40 active:scale-95 animate-fade-in"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </Link>

      {/* Reusable Confirmation Modal (Replacing Alert Confirm) */}
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
                  Tindakan ini akan menghapus data siswa bernama <strong className="text-on-surface">{studentToDelete.name}</strong> secara permanen dari sistem.
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
                    <option value="8C">Kelas 8C</option>
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
