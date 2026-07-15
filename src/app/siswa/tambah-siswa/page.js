"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const initialStudents = [
  { id: 1, name: "Ahmad Fauzi", nis: "102938", class: "7A" },
  { id: 2, name: "Budi Darmawan", nis: "102939", class: "7A" },
  { id: 3, name: "Citra Kirana", nis: "102940", class: "8C" }
];

export default function TambahSiswaPage() {
  const router = useRouter();
  const [namaLengkap, setNamaLengkap] = useState("");
  const [pilihKelas, setPilihKelas] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!namaLengkap || !pilihKelas) {
      setAlertMessage("Nama lengkap dan kelas wajib diisi!");
      setIsAlertOpen(true);
      return;
    }

    setIsSubmitting(true);

    // Retrieve current list from localStorage
    const stored = localStorage.getItem("daftar_siswa");
    let currentStudents = [];
    if (stored) {
      try {
        currentStudents = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored students", e);
      }
    }

    // Create new student object with isNew flag
    const newStudent = {
      id: Date.now(),
      name: namaLengkap,
      class: pilihKelas,
      nis: "",
      isNew: true
    };

    const updated = [...currentStudents, newStudent];
    localStorage.setItem("daftar_siswa", JSON.stringify(updated));

    // Simulate small saving transition and redirect
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/siswa");
    }, 400);
  };

  return (
    <div className="w-full max-w-2xl md:max-w-4xl mx-auto p-container-margin md:mt-lg">
      {/* Page Header (Desktop only) */}
      <div className="hidden md:flex items-center gap-3 mb-6">
        <Link
          href="/siswa"
          className="flex items-center justify-center p-2 rounded-full hover:bg-surface-container-low transition-colors duration-200 active:opacity-70 text-on-surface-variant"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
            arrow_back
          </span>
        </Link>
        <h1 className="font-h1-mobile text-h1-mobile font-semibold text-primary">Tambah Siswa</h1>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
        {/* Contextual Header */}
        <div className="mb-lg">
          <h2 className="font-h2 text-h2 text-on-surface mb-xs">Data Diri Siswa</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Masukkan informasi lengkap siswa baru ke dalam sistem.
          </p>
        </div>

        {/* Form Start */}
        <form onSubmit={handleSubmit} className="space-y-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            {/* Input: Nama Lengkap */}
            <div className="flex flex-col gap-xs">
              <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="namaLengkap">
                NAMA LENGKAP
              </label>
              <input
                className="w-full px-md py-sm font-body-md text-body-md text-on-surface bg-surface-container-lowest border border-outline-variant rounded focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder-outline"
                id="namaLengkap"
                name="namaLengkap"
                placeholder="Masukkan nama lengkap siswa"
                required
                type="text"
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
              />
            </div>

            {/* Input: Pilih Kelas */}
            <div className="flex flex-col gap-xs">
              <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="pilihKelas">
                PILIH KELAS
              </label>
              <div className="relative">
                <select
                  className="w-full px-md py-sm font-body-md text-body-md text-on-surface bg-surface-container-lowest border border-outline-variant rounded focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 appearance-none pr-xl"
                  id="pilihKelas"
                  name="pilihKelas"
                  required
                  value={pilihKelas}
                  onChange={(e) => setPilihKelas(e.target.value)}
                >
                  <option value="" disabled>
                    Pilih kelas yang tersedia
                  </option>
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
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-md text-on-surface-variant">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
                    arrow_drop_down
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Spacer for layout */}
          <div className="h-4"></div>

          {/* Submit Action */}
          <div className="pt-sm border-t border-outline-variant border-dashed">
            <button
              className="w-full flex items-center justify-center gap-sm bg-primary text-on-primary font-body-lg text-body-lg font-semibold py-sm rounded-lg hover:bg-primary-container transition-colors duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              type="submit"
              disabled={isSubmitting}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
                {isSubmitting ? "sync" : "save"}
              </span>
              {isSubmitting ? "Menyimpan..." : "Simpan Siswa"}
            </button>
          </div>
        </form>
      </div>

      {/* ALERT MODAL */}
      {isAlertOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-surface w-[95%] sm:w-full max-w-md rounded-xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-h2 text-h2 text-on-surface font-semibold">Peringatan</h2>
              <button
                onClick={() => setIsAlertOpen(false)}
                className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                aria-label="Close modal"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto font-body-md text-body-md text-on-surface-variant">
              <div className="flex flex-col items-center gap-md text-center py-2">
                <span className="material-symbols-outlined text-[48px] text-error">error</span>
                <div>
                  <p className="font-body-lg text-body-lg font-semibold text-on-surface">
                    Gagal Menyimpan Data
                  </p>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
                    {alertMessage}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-end">
              <button
                onClick={() => setIsAlertOpen(false)}
                className="px-6 py-2 bg-primary text-on-primary rounded font-label-caps text-label-caps shadow-sm hover:bg-primary/95 transition-colors active:scale-95 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
