"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";

const parseKehadiranString = (kehadiranStr) => {
  if (!kehadiranStr) return [];
  const lines = kehadiranStr.split("\n").filter(Boolean);
  return lines.map((line) => {
    const parts = line.split(":");
    const header = parts[0] || "";
    const body = parts.slice(1).join(":") || "";
    
    const classCode = header.replace("Kelas", "").trim();
    const studentDetails = body.split(",")
      .map(item => item.trim())
      .filter(Boolean)
      .map(item => {
        const match = item.match(/(.+?)\s*\((.+?)\)/);
        if (match) {
          return {
            name: match[1].trim(),
            status: match[2].trim()
          };
        }
        return { name: item, status: "Hadir" };
      });
      
    return {
      kelas: classCode,
      siswaDetail: studentDetails,
      totalSiswa: studentDetails.length,
      rekap: {
        hadir: studentDetails.filter(s => s.status === "Hadir").length,
        sakit: studentDetails.filter(s => s.status === "Sakit").length,
        izin: studentDetails.filter(s => s.status === "Izin").length,
        alpa: studentDetails.filter(s => s.status === "Alpa").length,
        bolos: studentDetails.filter(s => s.status === "Bolos").length,
      }
    };
  });
};

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const [toast, setToast] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [syncKey, setSyncKey] = useState(0);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [teacherName, setTeacherName] = useState("Guru Terbaik");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then(res => res.json())
      .then(data => {
        if (data.displayName) {
          setTeacherName(data.displayName);
        }
      })
      .catch(err => console.error("Gagal memuat profil:", err));
  }, []);

  const openProfileModal = () => {
    setProfileNameInput(teacherName);
    setIsProfileModalOpen(true);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileNameInput.trim()) {
      showToast("Nama tidak boleh kosong", "error");
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: profileNameInput.trim() })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal memperbarui profil");
      }

      const result = await res.json();
      setTeacherName(result.displayName);
      showToast("Profil berhasil diperbarui!", "success");
      setIsProfileModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const storedSiswa = localStorage.getItem("daftar_siswa");
    const storedPresensi = localStorage.getItem("riwayat_presensi");
    if (storedSiswa && storedPresensi) {
      setIsInitializing(false);
    }

    const initializeData = async () => {
      try {
        const storedSiswa = localStorage.getItem("daftar_siswa");
        const storedPresensi = localStorage.getItem("riwayat_presensi");
        const storedMateri = localStorage.getItem("daftar_materi_pokok");
        const storedJurnal = localStorage.getItem("jurnal_entries");

        let isSiswaEmpty = true;
        let isPresensiEmpty = true;
        let isMateriEmpty = true;
        let isJurnalEmpty = true;

        if (storedSiswa) {
          try {
            const parsed = JSON.parse(storedSiswa);
            if (Array.isArray(parsed) && parsed.length > 0) {
              isSiswaEmpty = false;
            }
          } catch (e) {}
        }

        if (storedPresensi) {
          try {
            const parsed = JSON.parse(storedPresensi);
            if (Array.isArray(parsed) && parsed.length > 0) {
              isPresensiEmpty = false;
            }
          } catch (e) {}
        }

        if (storedMateri) {
          try {
            const parsed = JSON.parse(storedMateri);
            if (Array.isArray(parsed) && parsed.length > 0) {
              isMateriEmpty = false;
            }
          } catch (e) {}
        }

        if (storedJurnal) {
          try {
            const parsed = JSON.parse(storedJurnal);
            if (Array.isArray(parsed) && parsed.length > 0) {
              isJurnalEmpty = false;
            }
          } catch (e) {}
        }

        if (isSiswaEmpty || isPresensiEmpty || isMateriEmpty || isJurnalEmpty) {
          console.log("Seed data is empty or incomplete. Fetching from APIs...");
          const [resSiswa, resPresensi, resMateri, resJurnal] = await Promise.all([
            fetch("/api/siswa").catch(() => null),
            fetch("/api/presensi").catch(() => null),
            fetch("/api/materi-pokok").catch(() => null),
            fetch("/api/jurnal").catch(() => null)
          ]);

          let mappedSiswa = [];
          if (resSiswa && resSiswa.ok) {
            const dataSiswa = await resSiswa.json().catch(() => ({}));
            if (dataSiswa && Array.isArray(dataSiswa.data)) {
              mappedSiswa = dataSiswa.data.map((item) => {
                const rawNis = item.NIS !== undefined ? item.NIS :
                               item.nis !== undefined ? item.nis :
                               item.Nis !== undefined ? item.Nis :
                               item.ID !== undefined ? item.ID :
                               item.id !== undefined ? item.id : "";
                return {
                  id: rawNis || item._rowNum,
                  name: item["Nama Siswa"] || "",
                  class: item["Kelas"] || "",
                  nis: rawNis.toString().trim(),
                  _rowNum: item._rowNum
                };
              });
            }
          }

          let mappedPresensi = [];
          if (resPresensi && resPresensi.ok) {
            const dataPresensi = await resPresensi.json().catch(() => ({}));
            if (dataPresensi && Array.isArray(dataPresensi.data)) {
              mappedPresensi = dataPresensi.data.map((item, idx) => ({
                id: `sheet_day_${idx}_${Date.now()}`,
                tanggal: item.Tanggal,
                classesList: parseKehadiranString(item.Kehadiran),
                synced: true
              }));
            }
          }

          let mappedMateri = [];
          if (resMateri && resMateri.ok) {
            const dataMateri = await resMateri.json().catch(() => ({}));
            if (dataMateri && Array.isArray(dataMateri.data)) {
              mappedMateri = dataMateri.data.map((item) => ({
                id: item.ID || item._rowNum,
                name: item["Materi Pokok"] || "",
                synced: true,
                _rowNum: item._rowNum
              }));
            }
          }

          let mappedJurnal = [];
          if (resJurnal && resJurnal.ok) {
            const dataJurnal = await resJurnal.json().catch(() => ({}));
            if (dataJurnal && Array.isArray(dataJurnal.data)) {
              const formatHariTanggal = (dateStr) => {
                if (!dateStr) return "";
                const date = new Date(dateStr);
                const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
                const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
                const dayName = days[date.getDay()];
                const dayNum = date.getDate();
                const monthName = months[date.getMonth()];
                const year = date.getFullYear();
                return `${dayName}, ${dayNum < 10 ? '0' + dayNum : dayNum} ${monthName} ${year}`;
              };
              mappedJurnal = dataJurnal.data.map(item => {
                const rawDate = item["Hari, tanggal"];
                const formattedDate = rawDate && !rawDate.includes(",") ? formatHariTanggal(rawDate) : rawDate;
                return { ...item, "Hari, tanggal": formattedDate, synced: true };
              });
            }
          }

          localStorage.setItem("daftar_siswa", JSON.stringify(mappedSiswa));
          localStorage.setItem("riwayat_presensi", JSON.stringify(mappedPresensi));
          localStorage.setItem("daftar_materi_pokok", JSON.stringify(mappedMateri));
          localStorage.setItem("jurnal_entries", JSON.stringify(mappedJurnal));

          const active = mappedSiswa.filter((s) => s.class).map((s) => s.class);
          const unique = [...new Set(active)].sort();
          localStorage.setItem("daftar_kelas", JSON.stringify(unique));
        } else {
          console.log("Cached data found. Bypassing API fetches.");
        }
      } catch (err) {
        console.error("Initialization error:", err);
        // Ensure fallbacks are written if critical failure occurs
        if (!localStorage.getItem("daftar_siswa")) {
          localStorage.setItem("daftar_siswa", JSON.stringify([]));
        }
        if (!localStorage.getItem("riwayat_presensi")) {
          localStorage.setItem("riwayat_presensi", JSON.stringify([]));
        }
        if (!localStorage.getItem("daftar_materi_pokok")) {
          localStorage.setItem("daftar_materi_pokok", JSON.stringify([]));
        }
        if (!localStorage.getItem("jurnal_entries")) {
          localStorage.setItem("jurnal_entries", JSON.stringify([]));
        }
        if (!localStorage.getItem("daftar_kelas")) {
          localStorage.setItem("daftar_kelas", JSON.stringify([]));
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initializeData();
  }, []);

  const isLoginPage = pathname === "/login";
  const isJurnalActive = pathname === "/";
  const isSiswaActive = pathname.startsWith("/siswa");
  const isKelasActive = pathname.startsWith("/kelas") || pathname.startsWith("/presensi");
  const isRekapActive = pathname.startsWith("/rekap-presensi");
  const isManajemenActive = pathname === "/manajemen";
  const isTambahSiswa = pathname === "/siswa/tambah-siswa";

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-background text-on-background">
        {children}
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-background">
        <span className="material-symbols-outlined text-[48px] animate-spin text-primary">sync</span>
      </div>
    );
  }

  const handleManualSync = async () => {
    if (isManualSyncing) return;
    setIsManualSyncing(true);
    showToast("Sinkronisasi data dari Google Sheet...", "info");
    localStorage.clear()
    try {
      const [resSiswa, resPresensi, resMateri, resJurnal] = await Promise.all([
        fetch("/api/siswa").catch(() => null),
        fetch("/api/presensi").catch(() => null),
        fetch("/api/materi-pokok").catch(() => null),
        fetch("/api/jurnal").catch(() => null)
      ]);

      let mappedSiswa = [];
      if (resSiswa && resSiswa.ok) {
        const dataSiswa = await resSiswa.json().catch(() => ({}));
        if (dataSiswa && Array.isArray(dataSiswa.data)) {
          mappedSiswa = dataSiswa.data.map((item) => {
            const rawNis = item.NIS !== undefined ? item.NIS :
                           item.nis !== undefined ? item.nis :
                           item.Nis !== undefined ? item.Nis :
                           item.ID !== undefined ? item.ID :
                           item.id !== undefined ? item.id : "";
            return {
              id: rawNis || item._rowNum,
              name: item["Nama Siswa"] || "",
              class: item["Kelas"] || "",
              nis: rawNis.toString().trim(),
              _rowNum: item._rowNum
            };
          });
        }
      }

      let mappedPresensi = [];
      if (resPresensi && resPresensi.ok) {
        const dataPresensi = await resPresensi.json().catch(() => ({}));
        if (dataPresensi && Array.isArray(dataPresensi.data)) {
          mappedPresensi = dataPresensi.data.map((item, idx) => ({
            id: `sheet_day_${idx}_${Date.now()}`,
            tanggal: item.Tanggal,
            classesList: parseKehadiranString(item.Kehadiran),
            synced: true
          }));
        }
      }

      let mappedMateri = [];
      if (resMateri && resMateri.ok) {
        const dataMateri = await resMateri.json().catch(() => ({}));
        if (dataMateri && Array.isArray(dataMateri.data)) {
          mappedMateri = dataMateri.data.map((item) => ({
            id: item.ID || item._rowNum,
            name: item["Materi Pokok"] || "",
            synced: true,
            _rowNum: item._rowNum
          }));
        }
      }

      let mappedJurnal = [];
      if (resJurnal && resJurnal.ok) {
        const dataJurnal = await resJurnal.json().catch(() => ({}));
        if (dataJurnal && Array.isArray(dataJurnal.data)) {
          const formatHariTanggal = (dateStr) => {
            if (!dateStr) return "";
            const date = new Date(dateStr);
            const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
            const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
            const dayName = days[date.getDay()];
            const dayNum = date.getDate();
            const monthName = months[date.getMonth()];
            const year = date.getFullYear();
            return `${dayName}, ${dayNum < 10 ? '0' + dayNum : dayNum} ${monthName} ${year}`;
          };
          mappedJurnal = dataJurnal.data.map(item => {
            const rawDate = item["Hari, tanggal"];
            const formattedDate = rawDate && !rawDate.includes(",") ? formatHariTanggal(rawDate) : rawDate;
            return { ...item, "Hari, tanggal": formattedDate, synced: true };
          });
        }
      }

      localStorage.setItem("daftar_siswa", JSON.stringify(mappedSiswa));
      localStorage.setItem("riwayat_presensi", JSON.stringify(mappedPresensi));
      localStorage.setItem("daftar_materi_pokok", JSON.stringify(mappedMateri));
      localStorage.setItem("jurnal_entries", JSON.stringify(mappedJurnal));
      
      const active = mappedSiswa.filter((s) => s.class).map((s) => s.class);
      const unique = [...new Set(active)].sort();
      localStorage.setItem("daftar_kelas", JSON.stringify(unique));

      setSyncKey((prev) => prev + 1);
      showToast("Sinkronisasi data selesai!", "success");
    } catch (e) {
      console.error(e);
      showToast("Sinkronisasi gagal!", "error");
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/logout", {
        method: "POST",
      });
      if (res.ok) {
        window.location.href = "/login";
      } else {
        showToast("Gagal keluar", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Gagal keluar", "error");
    }
  };

  return (
    <div className={`min-h-screen flex flex-col pt-16 ${isTambahSiswa ? "pb-0" : "pb-20"} md:pb-0 md:pl-72 bg-background text-on-background`}>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-md border animate-fade-in bg-inverse-surface text-inverse-on-surface border-transparent">
          <span className="font-body-md text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* TopAppBar (Mobile & Tablet) */}
      <header className="bg-surface border-b border-outline-variant fixed top-0 w-full z-50 flex justify-between items-center px-container-margin h-16 md:w-[calc(100%-18rem)] md:left-72 transition-all">
        <div className="flex items-center gap-4">
          {isTambahSiswa ? (
            <Link
              href="/siswa"
              className="md:hidden text-primary hover:bg-surface-container-high transition-colors p-2 rounded-full flex items-center justify-center"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_back</span>
            </Link>
          ) : (
            <button
              onClick={() => showToast("Menu sidebar akan segera hadir!", "info")}
              className="md:hidden text-primary hover:bg-surface-container-high transition-colors p-2 rounded-full flex items-center justify-center"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          )}
          <h1 className="font-h1-mobile text-h1-mobile font-bold text-primary">
            <span className="md:hidden">{isTambahSiswa ? "Tambah Siswa" : "Jurnal Mengajar"}</span>
            <span className="hidden md:inline">Jurnal Mengajar</span>
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleManualSync}
            disabled={isManualSyncing}
            className="text-primary hover:bg-surface-container-high transition-colors p-2 rounded-full flex items-center justify-center disabled:opacity-50"
            title="Sinkronisasi Manual"
          >
            <span className={`material-symbols-outlined ${isManualSyncing ? "animate-spin" : ""}`}>sync</span>
          </button>
          <button
            onClick={handleLogout}
            className="text-error hover:bg-error-container/20 transition-colors p-2 rounded-full flex items-center justify-center"
            title="Keluar"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      {/* NavigationDrawer (Web/Desktop Only) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-[60] flex-col py-lg h-full w-72 rounded-r-xl bg-surface shadow-lg border-r border-outline-variant">
        {/* Profile Header */}
        <div
          onClick={openProfileModal}
          className="px-container-margin mb-8 flex items-center gap-4 cursor-pointer hover:bg-surface-container-high transition-colors rounded-xl p-2"
          title="Atur Profil"
        >
          <img
            alt="Foto Profil Guru"
            className="w-12 h-12 rounded-full object-cover border border-outline-variant flex-shrink-0"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvojQwEtGFaVdGzsoleYLUMtjK6m88IoL7ytbZq_yTAq6kJa_hs08rjN3cTJM5b-edFscwNn6DQLKqcfUJsGv66f0fghI75Zdw58jtjyCpMvKE6-kSOWhQRjC_MKThVHVYzBRbpgcg5GXScP8271mdyauSXWEHaiPkFBp6Jaz0bKjZdS2qZoRmzpifJknU23Qgk0RRLEdUGICMQ6yyLaPLDtmKvnhBhGwp6bfnaxZU_q5D2UaHjZqy2_VAcVJrC_iaTzVLYDaoZw"
          />
          <div className="min-w-0 flex-grow">
            <h2 className="font-h2 text-h2 font-bold text-primary truncate" title={teacherName}>
              {teacherName}
            </h2>
            <p className="font-caption text-caption text-on-surface-variant hover:underline mt-0.5">Atur Profil</p>
          </div>
        </div>
        {/* Nav Items */}
        <nav className="flex-1 flex flex-col gap-2 px-2">
          <Link
            href="/"
            className={`flex items-center gap-3 mx-2 px-4 py-3 rounded-full transition-all duration-200 ${
              isJurnalActive
                ? "bg-primary-container text-on-primary-container font-bold"
                : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
            }`}
          >
            <span className={`material-symbols-outlined ${isJurnalActive ? "icon-fill" : ""}`}>history_edu</span>
            <span className="font-body-md text-body-md">Dashboard</span>
          </Link>
          <Link
            href="/rekap-presensi"
            className={`flex items-center gap-3 mx-2 px-4 py-3 rounded-full transition-all duration-200 ${
              isRekapActive
                ? "bg-primary-container text-on-primary-container font-bold"
                : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
            }`}
          >
            <span className={`material-symbols-outlined ${isRekapActive ? "icon-fill" : ""}`}>analytics</span>
            <span className="font-body-md text-body-md">Rekap Presensi</span>
          </Link>

          <Link
            href="/kelas"
            className={`flex items-center gap-3 mx-2 px-4 py-3 rounded-full transition-all duration-200 ${
              isKelasActive
                ? "bg-primary-container text-on-primary-container font-bold"
                : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
            }`}
          >
            <span className={`material-symbols-outlined ${isKelasActive ? "icon-fill" : ""}`}>school</span>
            <span className="font-body-md text-body-md">Kelas</span>
          </Link>
          <Link
            href="/manajemen"
            className={`flex items-center gap-3 mx-2 px-4 py-3 rounded-full transition-all duration-200 ${
              isManajemenActive
                ? "bg-primary-container text-on-primary-container font-bold"
                : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
            }`}
          >
            <span className={`material-symbols-outlined ${isManajemenActive ? "icon-fill" : ""}`}>settings</span>
            <span className="font-body-md text-body-md">Atur Data</span>
          </Link>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 mx-2 px-4 py-3 rounded-full transition-all duration-200 text-error hover:bg-error-container/20 hover:text-error mt-auto cursor-pointer"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-body-md text-body-md font-bold">Keluar</span>
          </button>
        </nav>
      </aside>

      {/* Page Canvas Container */}
      <div key={`${pathname}-${syncKey}`} className="flex-grow flex flex-col animate-fade-in">
        {children}
      </div>

      {/* BottomNavBar (Mobile Only) - Fixed Bottom */}
      {!isTambahSiswa && (
        <nav className="md:hidden bg-surface border-t border-outline-variant fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 px-2 pb-safe">
          {/* Tab Jurnal */}
          <Link
            href="/"
            className="flex flex-col items-center justify-center w-16 h-full font-label-caps text-label-caps"
          >
            {isJurnalActive ? (
              <div className="bg-secondary-container text-on-secondary-container rounded-full px-4 py-1 scale-95 active:scale-90 transition-transform font-semibold flex flex-col items-center justify-center">
                <span className="material-symbols-outlined icon-fill">history_edu</span>
                <span className="text-[10px] mt-0.5">Jurnal</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-transform scale-95 active:scale-90">
                <span className="material-symbols-outlined mb-1">history_edu</span>
                <span>Jurnal</span>
              </div>
            )}
          </Link>

          {/* Tab Rekap */}
          <Link
            href="/rekap-presensi"
            className="flex flex-col items-center justify-center w-16 h-full font-label-caps text-label-caps"
          >
            {isRekapActive ? (
              <div className="bg-secondary-container text-on-secondary-container rounded-full px-4 py-1 scale-95 active:scale-90 transition-transform font-semibold flex flex-col items-center justify-center">
                <span className="material-symbols-outlined icon-fill">analytics</span>
                <span className="text-[10px] mt-0.5">Rekap</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-transform scale-95 active:scale-90">
                <span className="material-symbols-outlined mb-1">analytics</span>
                <span>Rekap</span>
              </div>
            )}
          </Link>
          <Link
            href="/kelas"
            className="flex flex-col items-center justify-center w-16 h-full font-label-caps text-label-caps"
          >
            {isKelasActive ? (
              <div className="bg-secondary-container text-on-secondary-container rounded-full px-4 py-1 scale-95 active:scale-90 transition-transform font-semibold flex flex-col items-center justify-center">
                <span className="material-symbols-outlined icon-fill">school</span>
                <span className="text-[10px] mt-0.5">Kelas</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-transform scale-95 active:scale-90">
                <span className="material-symbols-outlined mb-1">school</span>
                <span>Kelas</span>
              </div>
            )}
          </Link>

          {/* Tab Atur */}
          <Link
            href="/manajemen"
            className="flex flex-col items-center justify-center w-16 h-full font-label-caps text-label-caps"
          >
            {isManajemenActive ? (
              <div className="bg-secondary-container text-on-secondary-container rounded-full px-4 py-1 scale-95 active:scale-90 transition-transform font-semibold flex flex-col items-center justify-center">
                <span className="material-symbols-outlined icon-fill">settings</span>
                <span className="text-[10px] mt-0.5">Atur</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-transform scale-95 active:scale-90">
                <span className="material-symbols-outlined mb-1">settings</span>
                <span>Atur</span>
              </div>
            )}
          </Link>
        </nav>
      )}
      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-surface w-[95%] sm:w-full max-w-2xl rounded-xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-h2 text-h2 text-on-surface font-semibold">Atur Profil</h2>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                aria-label="Close modal"
                type="button"
                disabled={isSavingProfile}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto font-body-md text-body-md text-on-surface-variant">
              <form id="profileForm" onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="flex flex-col gap-xs">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">
                    Nama Lengkap / Tampilan <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profileNameInput}
                    onChange={(e) => setProfileNameInput(e.target.value)}
                    className="w-full bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md"
                    placeholder="Masukkan nama tampilan..."
                    disabled={isSavingProfile}
                    autoFocus
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-end gap-sm">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2 border border-outline text-on-surface hover:bg-surface-container-high rounded font-label-caps text-label-caps transition-colors cursor-pointer"
                disabled={isSavingProfile}
              >
                Batal
              </button>
              <button
                type="submit"
                form="profileForm"
                className="px-4 py-2 bg-primary text-on-primary rounded font-label-caps text-label-caps shadow-sm hover:bg-primary/95 transition-colors flex items-center gap-xs cursor-pointer disabled:opacity-50"
                disabled={isSavingProfile}
              >
                {isSavingProfile && (
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                )}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
