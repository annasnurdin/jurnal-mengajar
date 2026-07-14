"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const initialStudents = [
  { id: 1, name: "Ahmad Fauzi", nis: "102938", class: "7A" },
  { id: 2, name: "Budi Darmawan", nis: "102939", class: "7A" },
  { id: 3, name: "Citra Kirana", nis: "102940", class: "8C" }
];

function SiswaContent() {
  const searchParams = useSearchParams();
  const kelasParam = searchParams.get("kelas");

  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("Semua Kelas");
  const [isLoading, setIsLoading] = useState(true);

  // Modal States for Student CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
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

  // Load students dummy data on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setStudents(initialStudents);
      setFilteredStudents(initialStudents);
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

  // Open Add Student Modal
  const openCreateModal = () => {
    setModalMode("create");
    setSelectedStudent(null);
    setStudentForm({
      name: "",
      nis: "",
      class: "7A"
    });
    setIsModalOpen(true);
  };

  // Open Edit Student Modal
  const openEditModal = (student) => {
    setModalMode("edit");
    setSelectedStudent(student);
    setStudentForm({
      name: student.name,
      nis: student.nis,
      class: student.class
    });
    setIsModalOpen(true);
  };

  // Handle Form Submit (Local CRUD)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.nis) {
      showToast("Nama dan NIS wajib diisi!", "error");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      if (modalMode === "create") {
        const newStudent = {
          id: students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1,
          name: studentForm.name,
          nis: studentForm.nis,
          class: studentForm.class
        };
        setStudents((prev) => [...prev, newStudent]);
        showToast("Siswa berhasil ditambahkan!");
      } else {
        // Edit mode
        setStudents((prev) =>
          prev.map((s) => (s.id === selectedStudent.id ? { ...s, ...studentForm } : s))
        );
        showToast("Data siswa berhasil diperbarui!");
      }
      setIsModalOpen(false);
      setIsSubmitting(false);
    }, 400);
  };

  // Delete Student
  const handleDelete = (student) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus siswa ${student.name}?`)) {
      return;
    }
    setStudents((prev) => prev.filter((s) => s.id !== student.id));
    showToast("Siswa berhasil dihapus!", "success");
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
      <main className="w-full max-w-4xl px-container-margin py-md flex-grow mx-auto">
        
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
              <button
                onClick={openCreateModal}
                className="bg-primary text-on-primary font-label-caps text-label-caps px-4 py-2 rounded shadow-sm hover:bg-primary/90 transition-colors"
              >
                Tambah Siswa Pertama
              </button>
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
                  className="bg-surface border border-outline-variant hover:border-primary p-4 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
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
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">badge</span> {student.nis}
                        </span>
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
                      onClick={() => handleDelete(student)}
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
      <button
        aria-label="Tambah Siswa"
        onClick={openCreateModal}
        className="fixed bottom-24 right-container-margin md:bottom-8 md:right-8 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-[0_8px_16px_rgba(30,64,175,0.25)] flex items-center justify-center hover:bg-primary/95 transition-all duration-300 z-40 active:scale-95 animate-fade-in"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      {/* CRUD MODAL FORM (Student) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-surface w-full max-w-lg rounded-lg shadow-2xl border border-outline-variant overflow-hidden transform scale-100 transition-all flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-h2 text-h2 text-on-surface">
                {modalMode === "create" ? "Tambah Siswa Baru" : "Edit Data Siswa"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-all flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-4">
              
              {/* Nama Siswa */}
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
                  NIS (Nomor Induk Siswa) <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
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
                </select>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-outline-variant flex items-center justify-end gap-sm">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-outline text-on-surface hover:bg-surface-container-high rounded font-label-caps text-label-caps transition-colors"
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-on-primary rounded font-label-caps text-label-caps shadow-sm hover:bg-primary/95 transition-colors flex items-center gap-xs"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                  )}
                  {modalMode === "create" ? "Tambah Siswa" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
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
