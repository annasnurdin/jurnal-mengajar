"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Manajemen() {
  const [counts, setCounts] = useState({ siswa: 0, kelas: 0, materi: 0 });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSiswa = localStorage.getItem("daftar_siswa");
      const storedKelas = localStorage.getItem("daftar_kelas");
      const storedMateri = localStorage.getItem("daftar_materi_pokok");

      let countSiswa = 0;
      let countKelas = 0;
      let countMateri = 0;

      if (storedSiswa) {
        try {
          countSiswa = JSON.parse(storedSiswa).filter((s) => !s.isDeleted).length;
        } catch (e) {}
      }
      if (storedKelas) {
        try {
          countKelas = JSON.parse(storedKelas).length;
        } catch (e) {}
      }
      if (storedMateri) {
        try {
          countMateri = JSON.parse(storedMateri).length;
        } catch (e) {}
      }

      const timer = setTimeout(() => {
        setCounts({ siswa: countSiswa, kelas: countKelas, materi: countMateri });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-md border animate-fade-in ${
            toast.type === "success"
              ? "bg-inverse-surface text-inverse-on-surface border-transparent"
              : toast.type === "error"
              ? "bg-error text-on-error border-transparent"
              : "bg-surface-container-highest text-on-surface-variant border-outline-variant"
          }`}
        >
          <span className="font-body-md text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Main Content Canvas */}
      <main className="max-w-7xl mx-auto px-container-margin py-md w-full">
        <header className="mb-8 text-center md:text-left">
          <h2 className="font-display text-display text-on-surface mb-2">Manajemen Data</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            Kelola data referensi utama untuk jurnal mengajar Anda. Pastikan data siswa, kelas, dan materi selalu up-to-date.
          </p>
        </header>

        {/* Hub Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter md:gap-lg mb-lg">
          {/* Data Siswa Card */}
          <Link
            href="/siswa"
            className="bg-surface rounded-xl border border-outline-variant p-lg flex flex-col justify-between hover:border-primary hover:bg-surface-container-lowest transition-colors group cursor-pointer h-full animate-fade-in"
          >
            <div>
              <div className="w-12 h-12 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center mb-md group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[24px]">group</span>
              </div>
              <h3 className="font-h2 text-h2 text-on-surface mb-xs">Data Siswa</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
                Kelola daftar siswa, NIS, dan status keaktifan.
              </p>
            </div>
            <div className="flex items-end justify-between border-t border-outline-variant pt-md mt-auto">
              <div>
                <span className="block font-label-caps text-label-caps text-outline mb-xs">TOTAL SISWA</span>
                <span className="font-h1 text-h1 text-primary">{counts.siswa}</span>
              </div>
              <div className="bg-surface-container-high text-on-surface hover:bg-surface-variant font-label-caps text-label-caps px-md py-sm rounded-lg transition-colors flex items-center space-x-2">
                <span className="material-symbols-outlined text-[18px]">edit</span>
                <span>Kelola</span>
              </div>
            </div>
          </Link>

          {/* Data Kelas Card */}
          <Link
            href="/kelas"
            className="bg-surface rounded-xl border border-outline-variant p-lg flex flex-col justify-between hover:border-primary hover:bg-surface-container-lowest transition-colors group cursor-pointer h-full animate-fade-in"
          >
            <div>
              <div className="w-12 h-12 bg-tertiary-container text-on-tertiary-container rounded-full flex items-center justify-center mb-md group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[24px] text-on-tertiary-container">school</span>
              </div>
              <h3 className="font-h2 text-h2 text-on-surface mb-xs">Data Kelas</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
                Atur ruang kelas, jurusan, dan wali kelas terkait.
              </p>
            </div>
            <div className="flex items-end justify-between border-t border-outline-variant pt-md mt-auto">
              <div>
                <span className="block font-label-caps text-label-caps text-outline mb-xs">TOTAL KELAS</span>
                <span className="font-h1 text-h1 text-primary">{counts.kelas}</span>
              </div>
              <div className="bg-surface-container-high text-on-surface hover:bg-surface-variant font-label-caps text-label-caps px-md py-sm rounded-lg transition-colors flex items-center space-x-2">
                <span className="material-symbols-outlined text-[18px]">edit</span>
                <span>Kelola</span>
              </div>
            </div>
          </Link>

          {/* Materi Pokok Card */}
          <Link
            href="/materi-pokok"
            className="bg-surface rounded-xl border border-outline-variant p-lg flex flex-col justify-between hover:border-primary hover:bg-surface-container-lowest transition-colors group cursor-pointer h-full animate-fade-in"
          >
            <div>
              <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center mb-md group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[24px]">menu_book</span>
              </div>
              <h3 className="font-h2 text-h2 text-on-surface mb-xs">Materi Pokok</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
                Susun silabus, kompetensi dasar, dan referensi belajar.
              </p>
            </div>
            <div className="flex items-end justify-between border-t border-outline-variant pt-md mt-auto">
              <div>
                <span className="block font-label-caps text-label-caps text-outline mb-xs">TOTAL MATERI</span>
                <span className="font-h1 text-h1 text-primary">{counts.materi}</span>
              </div>
              <div className="bg-surface-container-high text-on-surface hover:bg-surface-variant font-label-caps text-label-caps px-md py-sm rounded-lg transition-colors flex items-center space-x-2">
                <span className="material-symbols-outlined text-[18px]">edit</span>
                <span>Kelola</span>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </>
  );
}
