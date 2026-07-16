"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const initialStudents = [
  { id: "1234", name: "Annas", class: "7A", nis: "1234" },
  { id: "2345", name: "Ilma", class: "7A", nis: "2345" },
  { id: "3456", name: "Purwo", class: "7B", nis: "3456" },
  { id: "4567", name: "Karin", class: "7B", nis: "4567" },
  { id: "5678", name: "Soleh", class: "7C", nis: "5678" },
  { id: "6789", name: "Rido", class: "7D", nis: "6789" }
];

function PresensiContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kelasParam = searchParams.get("kelas");

  // App States
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tinder Swipe States
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attendance, setAttendance] = useState({}); // { studentId: "Hadir" | "Sakit" | "Izin" | "Alpa" | "Bolos" }
  const [history, setHistory] = useState([]); // Array of student ids in chronological decision order

  // Gesture Swipe States (Mobile only)
  const [dragStart, setDragStart] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Modal State for Reason (Mobile only)
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [modalStudent, setModalStudent] = useState(null);

  // Screen View: "swipe" | "summary" | "history"
  const [viewMode, setViewMode] = useState("swipe");
  const [riwayat, setRiwayat] = useState([]);
  const [isSyncing, setIsSyncing] = useState({}); // { recordId: boolean }

  // Toast State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const getIndonesianDate = (date) => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const todayStr = getIndonesianDate(new Date());

  // Load classes, students, and saved attendance from localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      // 1. Get students first
      const storedStudents = localStorage.getItem("daftar_siswa");
      let studentList = [];
      if (storedStudents) {
        try {
          const parsed = JSON.parse(storedStudents);
          if (Array.isArray(parsed) && parsed.length > 0) {
            studentList = parsed.filter(s => !s.isDeleted);
          }
        } catch (e) {
          console.error(e);
        }
      }
      if (studentList.length === 0) {
        studentList = initialStudents;
        localStorage.setItem("daftar_siswa", JSON.stringify(initialStudents));
      }
      setStudents(studentList);

      // 2. Extract classes dynamically from student data (Filter sendiri)
      const uniqueClasses = [...new Set(studentList.map(s => s.class).filter(Boolean))].sort();
      setClasses(uniqueClasses);

      // 3. Get Saved Attendance history
      const storedRiwayat = localStorage.getItem("riwayat_presensi");
      if (storedRiwayat) {
        try {
          setRiwayat(JSON.parse(storedRiwayat));
        } catch (e) {
          console.error(e);
        }
      }

      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Filter students based on kelas query param
  useEffect(() => {
    if (kelasParam && students.length > 0) {
      const filtered = students.filter(s => s.class === kelasParam);
      setClassStudents(filtered);
      setCurrentIndex(0);
      setAttendance({});
      setHistory([]);
      setViewMode("swipe");
    }
  }, [kelasParam, students]);

  // Gesture Swipe event handlers (Mobile only)
  const handleStart = (clientX, clientY) => {
    if (viewMode !== "swipe" || showReasonModal) return;
    setDragStart({ x: clientX, y: clientY });
    setIsDragging(true);
  };

  const handleMove = (clientX, clientY) => {
    if (!dragStart || !isDragging) return;
    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;
    // Limit vertical drag for standard swipe experience
    setDragOffset({ x: dx, y: dy * 0.3 });
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Swipe Threshold 120px
    if (dragOffset.x > 120) {
      // Swiped Right -> Hadir
      markAttendance("Hadir");
    } else if (dragOffset.x < -120) {
      // Swiped Left -> Absent flow (open modal)
      const currentStudent = classStudents[currentIndex];
      openReasonModal(currentStudent);
    } else {
      // Reset card pos
      setDragOffset({ x: 0, y: 0 });
      setDragStart(null);
    }
  };

  // Direct Button Handlers for Mobile controls
  const handleHadirClick = () => {
    if (currentIndex >= classStudents.length) return;
    markAttendance("Hadir");
  };

  const handleAbsentClick = () => {
    if (currentIndex >= classStudents.length) return;
    const currentStudent = classStudents[currentIndex];
    openReasonModal(currentStudent);
  };

  const openReasonModal = (student) => {
    setModalStudent(student);
    setShowReasonModal(true);
    // Smooth reset drag position
    setDragOffset({ x: 0, y: 0 });
    setDragStart(null);
  };

  const selectReason = (reason) => {
    if (!modalStudent) return;
    const studentId = modalStudent.id || modalStudent.nis;
    
    setAttendance(prev => ({
      ...prev,
      [studentId]: reason
    }));
    setHistory(prev => [...prev, studentId]);
    
    setShowReasonModal(false);
    setModalStudent(null);
    
    // Go to next card
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 50);
  };

  const cancelReasonModal = () => {
    setShowReasonModal(false);
    setModalStudent(null);
    setDragOffset({ x: 0, y: 0 });
    setDragStart(null);
  };

  const markAttendance = (status) => {
    const currentStudent = classStudents[currentIndex];
    if (!currentStudent) return;

    const studentId = currentStudent.id || currentStudent.nis;
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
    setHistory(prev => [...prev, studentId]);

    // Go to next card
    setDragOffset({ x: 0, y: 0 });
    setDragStart(null);
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 50);
  };

  // Undo Decision handler
  const handleUndo = () => {
    if (history.length === 0 || currentIndex === 0) return;
    
    const newHistory = [...history];
    const lastStudentId = newHistory.pop();
    
    const newAttendance = { ...attendance };
    delete newAttendance[lastStudentId];

    setAttendance(newAttendance);
    setHistory(newHistory);
    setCurrentIndex(prev => prev - 1);
    
    setDragOffset({ x: 0, y: 0 });
    setDragStart(null);
    
    showToast("Keputusan sebelumnya dibatalkan", "info");
  };

  // Save Attendance to LocalStorage
  const handleSaveAttendance = () => {
    const countStats = {
      hadir: 0,
      sakit: 0,
      izin: 0,
      alpa: 0,
      bolos: 0
    };

    const details = classStudents.map(student => {
      const studentId = student.id || student.nis;
      const status = attendance[studentId] || "Hadir";
      
      if (status === "Hadir") countStats.hadir++;
      else if (status === "Sakit") countStats.sakit++;
      else if (status === "Izin") countStats.izin++;
      else if (status === "Alpa") countStats.alpa++;
      else if (status === "Bolos") countStats.bolos++;

      return {
        id: studentId,
        name: student.name,
        nis: student.nis || "",
        status: status
      };
    });

    const newRecord = {
      id: "presensi_" + Date.now(),
      kelas: kelasParam,
      tanggal: todayStr,
      timestamp: Date.now(),
      totalSiswa: classStudents.length,
      rekap: countStats,
      siswaDetail: details,
      synced: false
    };

    const updatedRiwayat = [newRecord, ...riwayat];
    setRiwayat(updatedRiwayat);
    localStorage.setItem("riwayat_presensi", JSON.stringify(updatedRiwayat));
    
    showToast(`Presensi kelas ${kelasParam} berhasil disimpan!`);
    setViewMode("history");
  };

  // Sync Record Simulation
  const handleSyncRecord = (recordId) => {
    setIsSyncing(prev => ({ ...prev, [recordId]: true }));
    showToast("Menghubungkan ke server...", "info");

    setTimeout(() => {
      const updated = riwayat.map(item => {
        if (item.id === recordId) {
          return { ...item, synced: true };
        }
        return item;
      });

      setRiwayat(updated);
      localStorage.setItem("riwayat_presensi", JSON.stringify(updated));
      setIsSyncing(prev => ({ ...prev, [recordId]: false }));
      showToast("Data presensi berhasil disinkronkan ke Google Sheet!");
    }, 1500);
  };

  // Student Avatar Gradient helper
  const getAvatarGradient = (name) => {
    const letter = (name || "?").charAt(0).toUpperCase();
    if ("A" <= letter && letter <= "E") return "from-blue-500 to-indigo-600 text-white";
    if ("F" <= letter && letter <= "J") return "from-emerald-400 to-teal-600 text-white";
    if ("K" <= letter && letter <= "O") return "from-amber-400 to-orange-600 text-white";
    if ("P" <= letter && letter <= "T") return "from-pink-500 to-rose-600 text-white";
    return "from-purple-500 to-violet-700 text-white";
  };

  // 1. Loading Screen
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-xl gap-md text-on-surface-variant flex-grow h-96">
        <span className="material-symbols-outlined text-[48px] animate-spin text-primary">sync</span>
        <p className="font-body-lg text-body-lg">Memuat data presensi...</p>
      </div>
    );
  }

  // 2. Class Selection Screen (If no kelas param is specified)
  if (!kelasParam) {
    return (
      <main className="flex-grow px-container-margin py-md max-w-7xl mx-auto w-full">
        <div className="mb-lg">
          <h2 className="font-display text-display text-primary">Presensi Kelas</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Pilih kelas terlebih dahulu untuk mulai mengambil presensi siswa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {classes.map((cls, idx) => {
            const count = students.filter(s => s.class === cls).length;
            return (
              <Link
                key={idx}
                href={`/presensi?kelas=${cls}`}
                className="bg-surface rounded-xl border border-outline-variant p-5 hover:border-primary hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <span className="bg-primary-container text-on-primary-container font-h2 text-h2 w-12 h-12 rounded-lg flex items-center justify-center font-bold">
                    {cls}
                  </span>
                  <h3 className="font-h3 text-h3 text-on-surface mt-3">Kelas {cls}</h3>
                  <p className="font-caption text-caption text-on-surface-variant mt-1">{count} Siswa</p>
                </div>
                <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </Link>
            );
          })}
        </div>

        {/* Saved Records History Section */}
        {riwayat.length > 0 && (
          <div className="mt-xl border-t border-outline-variant pt-lg">
            <h3 className="font-h2 text-h2 text-on-surface mb-md">Riwayat Presensi Terbaru</h3>
            <div className="flex flex-col gap-3">
              {riwayat.slice(0, 5).map((record) => (
                <div key={record.id} className="bg-surface border border-outline-variant rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-md">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded text-xs font-bold">
                        Kelas {record.kelas}
                      </span>
                      <span className="font-caption text-caption text-on-surface-variant">
                        {record.tanggal}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs font-semibold mt-2 text-on-surface-variant flex-wrap">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">H: {record.rekap.hadir}</span>
                      {record.rekap.sakit > 0 && <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">S: {record.rekap.sakit}</span>}
                      {record.rekap.izin > 0 && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">I: {record.rekap.izin}</span>}
                      {record.rekap.alpa > 0 && <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full">A: {record.rekap.alpa}</span>}
                      {record.rekap.bolos > 0 && <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">B: {record.rekap.bolos}</span>}
                    </div>
                  </div>
                  <div>
                    {record.synced ? (
                      <span className="text-emerald-600 font-label-caps text-label-caps flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                        <span className="material-symbols-outlined text-[18px]">cloud_done</span>
                        Tersinkronisasi
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSyncRecord(record.id)}
                        disabled={isSyncing[record.id]}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-label-caps text-label-caps flex items-center gap-1.5 px-4 py-2 rounded-full transition-colors"
                      >
                        {isSyncing[record.id] ? (
                          <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                        ) : (
                          <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                        )}
                        {isSyncing[record.id] ? "Syncing..." : "Sync ke Sheet"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    );
  }

  // 3. Empty Class State
  if (classStudents.length === 0) {
    return (
      <main className="flex-grow px-container-margin py-md max-w-lg mx-auto w-full flex flex-col justify-center items-center text-center">
        <span className="material-symbols-outlined text-[72px] text-on-surface-variant">group_off</span>
        <h2 className="font-h1 text-h1 text-on-surface mt-4">Belum Ada Siswa</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-sm">
          Kelas {kelasParam} tidak memiliki siswa terdaftar. Silakan hubungi admin atau pilih kelas lain.
        </p>
        <div className="flex gap-3 mt-6">
          <Link
            href="/presensi"
            className="border border-outline px-4 py-2 rounded-lg font-label-caps text-label-caps text-on-surface hover:bg-surface-container-low transition-colors"
          >
            Pilih Kelas Lain
          </Link>
        </div>
      </main>
    );
  }

  const isCompleted = currentIndex >= classStudents.length;

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

      {/* Main Container */}
      <main className="flex-grow px-container-margin py-md max-w-4xl mx-auto w-full flex flex-col">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-on-surface-variant mb-4 font-caption text-caption flex-wrap">
          <Link href="/presensi" className="hover:text-primary transition-colors">Presensi</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface font-semibold">Kelas {kelasParam}</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span>{todayStr}</span>
        </div>

        {/* SWIPE CARD UI VIEW */}
        {viewMode === "swipe" && !isCompleted && (
          <div className="w-full flex-grow flex flex-col items-center">
            {/* Header info / Progress */}
            <div className="w-[280px] md:w-full md:max-w-2xl mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 mx-auto">
              <div className="text-center md:text-left flex-grow">
                <h2 className="font-display text-xl md:text-display text-primary font-black">Presensi Kelas {kelasParam}</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1 hidden md:block">
                  Silakan lakukan pencatatan presensi siswa untuk hari ini.
                </p>
              </div>
              
              <div className="w-full md:w-80 flex-shrink-0">
                <div className="flex items-center justify-between text-[10px] md:text-xs font-semibold text-on-surface-variant mb-1 px-1">
                  <span>Siswa {currentIndex + 1} dari {classStudents.length}</span>
                  <span>{Math.round((currentIndex / classStudents.length) * 100)}% Selesai</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden border border-outline-variant">
                  <div
                    className="bg-primary h-full transition-all duration-300 rounded-full"
                    style={{ width: `${(currentIndex / classStudents.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* MOBILE VIEW (Tinder Swipe) */}
            <div className="md:hidden w-full flex-grow flex flex-col justify-between items-center max-w-md mx-auto">
              {/* Tinder Card Stack */}
              <div className="relative w-[280px] h-[340px] flex items-center justify-center mb-6 select-none">
                
                {/* Card 2 (Bottom / Behind Card) */}
                {currentIndex + 1 < classStudents.length && (
                  <div className="absolute w-full h-full bg-surface border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col justify-between items-center scale-95 translate-y-3 opacity-70 pointer-events-none transition-all duration-300">
                    <div className="w-full flex justify-between items-center">
                      <span className="bg-surface-container text-on-surface-variant text-[10px] px-2 py-0.5 rounded-full font-bold">
                        NIS {classStudents[currentIndex + 1].nis || "-"}
                      </span>
                      <span className="text-on-surface-variant font-caption text-[10px]">Berikutnya</span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-3 text-center my-auto w-full">
                      <div className={`w-20 h-20 rounded-full bg-gradient-to-tr ${getAvatarGradient(classStudents[currentIndex + 1].name)} flex items-center justify-center font-display text-3xl shadow-sm`}>
                        {classStudents[currentIndex + 1].name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-h3 text-h3 text-on-surface font-extrabold line-clamp-1">{classStudents[currentIndex + 1].name}</h3>
                        <p className="font-caption text-[11px] text-on-surface-variant">Siswa Kelas {kelasParam}</p>
                      </div>
                    </div>
                    
                    <div className="w-full py-2 bg-surface-container-low rounded-xl border border-dashed border-outline-variant flex items-center justify-center text-[10px] font-semibold text-on-surface-variant">
                      Berikutnya
                    </div>
                  </div>
                )}

                {/* Card 1 (Top / Current Active Card) */}
                {currentIndex < classStudents.length && (
                  <div
                    onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
                    onMouseMove={(e) => isDragging && handleMove(e.clientX, e.clientY)}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
                    onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
                    onTouchEnd={handleEnd}
                    onDragStart={(e) => e.preventDefault()}
                    className={`absolute w-full h-full bg-surface border border-outline-variant rounded-2xl p-4 shadow-md flex flex-col justify-between items-center transition-shadow cursor-grab ${
                      isDragging ? "cursor-grabbing shadow-lg scale-[1.01]" : ""
                    }`}
                    style={{
                      transform: isDragging
                        ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${dragOffset.x * 0.08}deg)`
                        : "translate3d(0, 0, 0) rotate(0deg)",
                      transition: isDragging ? "none" : "transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.25)",
                      zIndex: 10,
                      touchAction: "none"
                    }}
                  >
                    {/* Overlay Badges */}
                    {dragOffset.x > 20 && (
                      <div
                        className="absolute top-6 left-6 border-2 border-emerald-500 text-emerald-500 font-display text-sm font-black px-2 py-0.5 rounded rotate-[-12deg] z-20 pointer-events-none uppercase tracking-wider"
                        style={{ opacity: Math.min(dragOffset.x / 100, 1) }}
                      >
                        Hadir
                      </div>
                    )}
                    {dragOffset.x < -20 && (
                      <div
                        className="absolute top-6 right-6 border-2 border-error text-error font-display text-sm font-black px-2 py-0.5 rounded rotate-[12deg] z-20 pointer-events-none uppercase tracking-wider"
                        style={{ opacity: Math.min(-dragOffset.x / 100, 1) }}
                      >
                        Absen
                      </div>
                    )}

                    {/* Card Header */}
                    <div className="w-full flex justify-between items-center">
                      <span className="bg-primary-container text-on-primary-container text-[10px] px-2 py-0.5 rounded-full font-bold">
                        NIS {classStudents[currentIndex].nis || "-"}
                      </span>
                      <span className="text-primary font-label-caps text-[10px] flex items-center gap-1 font-bold">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
                        Aktif
                      </span>
                    </div>

                    {/* Card Body Profile */}
                    <div className="flex flex-col items-center gap-3 text-center my-auto w-full">
                      <div className={`w-24 h-24 rounded-full bg-gradient-to-tr ${getAvatarGradient(classStudents[currentIndex].name)} flex items-center justify-center font-display text-4xl shadow-sm border-2 border-surface-container-lowest`}>
                        {classStudents[currentIndex].name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-h2 text-h2 text-on-surface font-extrabold line-clamp-1">{classStudents[currentIndex].name}</h3>
                        <p className="font-caption text-[11px] text-on-surface-variant">Siswa Kelas {kelasParam}</p>
                      </div>
                    </div>

                    {/* Card Instruction Help */}
                    <div className="w-full py-2 bg-surface-container-low rounded-xl text-center text-[10px] text-on-surface-variant font-medium flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-error">swipe_left</span>
                      <span>Geser kiri (Absen)</span>
                      <span className="text-outline">|</span>
                      <span>Geser kanan (Hadir)</span>
                      <span className="material-symbols-outlined text-[14px] text-emerald-600">swipe_right</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions Control Panel */}
              <div className="flex items-center justify-center gap-5 w-full mb-2">
                {/* Undo Button */}
                <button
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border outline-none ${
                    history.length === 0
                      ? "border-outline-variant text-outline-variant cursor-not-allowed opacity-50"
                      : "border-amber-500 text-amber-600 hover:bg-amber-50 active:scale-95"
                  }`}
                  title="Batal keputusan"
                >
                  <span className="material-symbols-outlined text-[20px]">undo</span>
                </button>

                {/* Cross (Absent) Button */}
                <button
                  onClick={handleAbsentClick}
                  className="w-14 h-14 bg-error-container hover:bg-red-200 text-error rounded-full flex items-center justify-center shadow active:scale-90 transition-all outline-none border border-red-300"
                  title="Tidak Hadir"
                >
                  <span className="material-symbols-outlined text-[26px]">close</span>
                </button>

                {/* Check (Present) Button */}
                <button
                  onClick={handleHadirClick}
                  className="w-14 h-14 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-full flex items-center justify-center shadow active:scale-90 transition-all outline-none border border-emerald-300"
                  title="Hadir"
                >
                  <span className="material-symbols-outlined text-[26px]">done</span>
                </button>
              </div>
            </div>

            {/* DESKTOP VIEW (Direct Attendance Buttons) */}
            <div className="hidden md:flex flex-col items-center w-full max-w-2xl bg-surface border border-outline-variant rounded-3xl p-8 shadow-xl">
              <div className="w-full flex justify-between items-center border-b border-outline-variant pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full font-bold text-xs">
                    NIS {classStudents[currentIndex].nis || "-"}
                  </span>
                  <span className="text-on-surface-variant text-xs">Siswa Kelas {kelasParam}</span>
                </div>
                <span className="text-emerald-600 font-label-caps text-label-caps flex items-center gap-1 font-bold text-xs bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Siap Absen
                </span>
              </div>

              {/* Profile Card */}
              <div className="flex items-center gap-6 w-full mb-8">
                <div className={`w-24 h-24 rounded-full bg-gradient-to-tr ${getAvatarGradient(classStudents[currentIndex].name)} flex items-center justify-center font-display text-4xl shadow-md border border-outline-variant`}>
                  {classStudents[currentIndex].name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-h1 text-h1 text-on-surface font-extrabold">{classStudents[currentIndex].name}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                    Pilih status kehadiran di bawah untuk memproses presensi siswa ini secara langsung.
                  </p>
                </div>
              </div>

              {/* 5 Attendance Buttons Grid */}
              <div className="grid grid-cols-5 gap-3 w-full">
                {/* Hadir */}
                <button
                  onClick={() => markAttendance("Hadir")}
                  className="flex flex-col items-center justify-center py-4 px-2 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 rounded-2xl transition-all hover:scale-102 active:scale-98 font-bold shadow-sm"
                >
                  <span className="material-symbols-outlined text-[28px] text-emerald-600 mb-1">done</span>
                  Hadir
                </button>

                {/* Sakit */}
                <button
                  onClick={() => markAttendance("Sakit")}
                  className="flex flex-col items-center justify-center py-4 px-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 rounded-2xl transition-all hover:scale-102 active:scale-98 font-bold shadow-sm"
                >
                  <span className="material-symbols-outlined text-[28px] text-amber-600 mb-1">medical_services</span>
                  Sakit
                </button>

                {/* Izin */}
                <button
                  onClick={() => markAttendance("Izin")}
                  className="flex flex-col items-center justify-center py-4 px-2 border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-950 rounded-2xl transition-all hover:scale-102 active:scale-98 font-bold shadow-sm"
                >
                  <span className="material-symbols-outlined text-[28px] text-blue-600 mb-1">contact_mail</span>
                  Izin
                </button>

                {/* Alpa */}
                <button
                  onClick={() => markAttendance("Alpa")}
                  className="flex flex-col items-center justify-center py-4 px-2 border border-red-300 bg-red-50 hover:bg-red-100 text-red-950 rounded-2xl transition-all hover:scale-102 active:scale-98 font-bold shadow-sm"
                >
                  <span className="material-symbols-outlined text-[28px] text-red-600 mb-1">warning</span>
                  Alpa
                </button>

                {/* Bolos */}
                <button
                  onClick={() => markAttendance("Bolos")}
                  className="flex flex-col items-center justify-center py-4 px-2 border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-950 rounded-2xl transition-all hover:scale-102 active:scale-98 font-bold shadow-sm"
                >
                  <span className="material-symbols-outlined text-[28px] text-purple-600 mb-1">cancel</span>
                  Bolos
                </button>
              </div>

              {/* Desktop Undo Panel */}
              <div className="w-full flex justify-between items-center mt-6 pt-4 border-t border-outline-variant">
                <span className="text-xs text-on-surface-variant font-medium">Siswa Berikutnya: {currentIndex + 1 < classStudents.length ? classStudents[currentIndex + 1].name : "-"}</span>
                <button
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl font-label-caps text-label-caps transition-all ${
                    history.length === 0
                      ? "border-outline-variant text-outline-variant cursor-not-allowed opacity-50"
                      : "border-amber-500 text-amber-600 hover:bg-amber-50 active:scale-95"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">undo</span>
                  Batal / Undo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL PILIH ALASAN TIDAK HADIR (Mobile Bottom Sheet / Desktop Overlay) */}
        {showReasonModal && modalStudent && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface w-full md:max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl border-t md:border border-outline-variant overflow-hidden flex flex-col max-h-[90vh] animate-slide-up md:animate-fade-in">
              {/* Handler Bar for Mobile Bottom Sheet */}
              <div className="md:hidden w-12 h-1 bg-outline-variant rounded-full mx-auto my-3 flex-shrink-0"></div>

              <div className="px-6 py-3 md:py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
                <h3 className="font-h2 text-h2 text-on-surface font-bold">Keterangan Absen</h3>
                <button
                  onClick={cancelReasonModal}
                  className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-all"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-5 md:p-6 overflow-y-auto">
                <p className="font-body-md md:font-body-lg text-on-surface">
                  Pilih alasan ketidakhadiran siswa:
                </p>
                <p className="font-h3 text-h3 text-primary font-extrabold mt-1">
                  {modalStudent.name}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-5 md:mt-6">
                  {/* Sakit */}
                  <button
                    onClick={() => selectReason("Sakit")}
                    className="flex flex-col items-center justify-center py-3.5 px-2 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-950 rounded-xl transition-all font-bold text-sm"
                  >
                    <span className="material-symbols-outlined text-[28px] text-amber-600 mb-1">medical_services</span>
                    Sakit
                  </button>

                  {/* Izin */}
                  <button
                    onClick={() => selectReason("Izin")}
                    className="flex flex-col items-center justify-center py-3.5 px-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-950 rounded-xl transition-all font-bold text-sm"
                  >
                    <span className="material-symbols-outlined text-[28px] text-blue-600 mb-1">contact_mail</span>
                    Izin
                  </button>

                  {/* Alpa */}
                  <button
                    onClick={() => selectReason("Alpa")}
                    className="flex flex-col items-center justify-center py-3.5 px-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-950 rounded-xl transition-all font-bold text-sm"
                  >
                    <span className="material-symbols-outlined text-[28px] text-red-600 mb-1">warning</span>
                    Alpa
                  </button>

                  {/* Bolos */}
                  <button
                    onClick={() => selectReason("Bolos")}
                    className="flex flex-col items-center justify-center py-3.5 px-2 border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-950 rounded-xl transition-all font-bold text-sm"
                  >
                    <span className="material-symbols-outlined text-[28px] text-purple-600 mb-1">cancel</span>
                    Bolos
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-end pb-safe">
                <button
                  onClick={cancelReasonModal}
                  className="w-full md:w-auto px-4 py-2.5 border border-outline rounded-xl font-label-caps text-label-caps text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Kembali ke Kartu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUMMARY SCREEN VIEW (At completion) */}
        {(viewMode === "summary" || isCompleted) && viewMode !== "history" && (
          <div className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-md max-w-2xl mx-auto w-full animate-fade-in">
            <div className="text-center border-b border-outline-variant pb-6 mb-6">
              <span className="material-symbols-outlined text-[54px] text-emerald-600">check_circle</span>
              <h2 className="font-display text-display text-on-surface mt-2">Presensi Selesai!</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Seluruh siswa kelas <strong>{kelasParam}</strong> telah dipresensi pada tanggal {todayStr}
              </p>
            </div>

            {/* Rekap Grid Stats */}
            <h3 className="font-h3 text-h3 text-on-surface mb-3">Ringkasan Kehadiran</h3>
            <div className="grid grid-cols-5 gap-1.5 md:gap-2 text-center mb-6">
              <div className="bg-emerald-50 border border-emerald-100 p-1.5 md:p-3 rounded-lg md:rounded-xl">
                <span className="block text-xl md:text-2xl font-black text-emerald-800">
                  {classStudents.filter(s => (attendance[s.id || s.nis] || "Hadir") === "Hadir").length}
                </span>
                <span className="text-[9px] md:text-[10px] uppercase font-bold text-emerald-600">Hadir</span>
              </div>
              <div className="bg-amber-50 border border-amber-100 p-1.5 md:p-3 rounded-lg md:rounded-xl">
                <span className="block text-xl md:text-2xl font-black text-amber-800">
                  {classStudents.filter(s => attendance[s.id || s.nis] === "Sakit").length}
                </span>
                <span className="text-[9px] md:text-[10px] uppercase font-bold text-amber-600">Sakit</span>
              </div>
              <div className="bg-blue-50 border border-blue-100 p-1.5 md:p-3 rounded-lg md:rounded-xl">
                <span className="block text-xl md:text-2xl font-black text-blue-800">
                  {classStudents.filter(s => attendance[s.id || s.nis] === "Izin").length}
                </span>
                <span className="text-[9px] md:text-[10px] uppercase font-bold text-blue-600">Izin</span>
              </div>
              <div className="bg-red-50 border border-red-100 p-1.5 md:p-3 rounded-lg md:rounded-xl">
                <span className="block text-xl md:text-2xl font-black text-red-800">
                  {classStudents.filter(s => attendance[s.id || s.nis] === "Alpa").length}
                </span>
                <span className="text-[9px] md:text-[10px] uppercase font-bold text-red-600">Alpa</span>
              </div>
              <div className="bg-purple-50 border border-purple-100 p-1.5 md:p-3 rounded-lg md:rounded-xl">
                <span className="block text-xl md:text-2xl font-black text-purple-800">
                  {classStudents.filter(s => attendance[s.id || s.nis] === "Bolos").length}
                </span>
                <span className="text-[9px] md:text-[10px] uppercase font-bold text-purple-600">Bolos</span>
              </div>
            </div>

            {/* List validation */}
            <h3 className="font-h3 text-h3 text-on-surface mb-3">Detail Kehadiran Siswa</h3>
            <div className="max-h-60 overflow-y-auto border border-outline-variant rounded-xl divide-y divide-outline-variant mb-6">
              {classStudents.map(student => {
                const sId = student.id || student.nis;
                const status = attendance[sId] || "Hadir";
                
                let badgeClass = "bg-emerald-100 text-emerald-800";
                if (status === "Sakit") badgeClass = "bg-amber-100 text-amber-800";
                if (status === "Izin") badgeClass = "bg-blue-100 text-blue-800";
                if (status === "Alpa") badgeClass = "bg-red-100 text-red-800";
                if (status === "Bolos") badgeClass = "bg-purple-100 text-purple-800";

                return (
                  <div key={sId} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-body-md text-body-md font-bold text-on-surface">{student.name}</p>
                      <p className="font-caption text-caption text-on-surface-variant">NIS {student.nis || "-"}</p>
                    </div>

                    {/* Quick status edit dropdown */}
                    <select
                      value={status}
                      onChange={(e) => {
                        setAttendance(prev => ({ ...prev, [sId]: e.target.value }));
                        showToast(`Status ${student.name} diubah`, "info");
                      }}
                      className={`${badgeClass} border-none font-bold text-xs rounded-full px-3 py-1 cursor-pointer outline-none focus:ring-1 focus:ring-primary`}
                    >
                      <option value="Hadir">Hadir</option>
                      <option value="Sakit">Sakit</option>
                      <option value="Izin">Izin</option>
                      <option value="Alpa">Alpa</option>
                      <option value="Bolos">Bolos</option>
                    </select>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setAttendance({});
                  setHistory([]);
                  setViewMode("swipe");
                }}
                className="px-4 py-2 border border-outline text-on-surface hover:bg-surface-container-low rounded-lg font-label-caps text-label-caps transition-colors"
              >
                Ulangi Presensi
              </button>
              <button
                onClick={handleSaveAttendance}
                className="px-5 py-2 bg-primary text-on-primary hover:bg-primary/95 rounded-lg font-label-caps text-label-caps shadow-sm transition-colors flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
                Simpan Presensi
              </button>
            </div>
          </div>
        )}

        {/* COMPLETED HISTORY VIEW */}
        {viewMode === "history" && (
          <div className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-md max-w-2xl mx-auto w-full animate-fade-in">
            <div className="flex items-center justify-between border-b border-outline-variant pb-4 mb-6 flex-wrap gap-2">
              <div>
                <h2 className="font-h1 text-h1 text-on-surface font-extrabold">Riwayat Presensi</h2>
                <p className="font-caption text-caption text-on-surface-variant">Daftar presensi kelas yang telah selesai dan tersimpan.</p>
              </div>
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setAttendance({});
                  setHistory([]);
                  setViewMode("swipe");
                }}
                className="bg-primary text-on-primary hover:bg-primary/90 px-4 py-2 rounded-lg font-label-caps text-label-caps flex items-center gap-xs shadow-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Mulai Presensi Baru
              </button>
            </div>

            {riwayat.length === 0 ? (
              <div className="text-center py-10">
                <span className="material-symbols-outlined text-[64px] text-on-surface-variant">history</span>
                <p className="font-body-md text-body-md text-on-surface-variant mt-2">Belum ada riwayat presensi tersimpan.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {riwayat.map((record) => (
                  <div key={record.id} className="border border-outline-variant rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low hover:bg-surface-container transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-primary-container text-on-primary-container px-2.5 py-0.5 rounded text-xs font-black">
                          Kelas {record.kelas}
                        </span>
                        <span className="text-xs font-semibold text-on-surface-variant">
                          {record.tanggal}
                        </span>
                      </div>
                      
                      {/* Rekap counters */}
                      <div className="flex flex-wrap gap-2 mt-3 text-[11px] font-bold text-on-surface-variant">
                        <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">Hadir: {record.rekap.hadir}</span>
                        {record.rekap.sakit > 0 && <span className="bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full">Sakit: {record.rekap.sakit}</span>}
                        {record.rekap.izin > 0 && <span className="bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded-full">Izin: {record.rekap.izin}</span>}
                        {record.rekap.alpa > 0 && <span className="bg-red-50 border border-red-200 text-red-800 px-2 py-0.5 rounded-full">Alpa: {record.rekap.alpa}</span>}
                        {record.rekap.bolos > 0 && <span className="bg-purple-50 border border-purple-200 text-purple-800 px-2 py-0.5 rounded-full">Bolos: {record.rekap.bolos}</span>}
                      </div>

                      {/* Expandable details preview */}
                      <details className="mt-3 text-xs">
                        <summary className="cursor-pointer text-primary font-semibold hover:underline outline-none">
                          Lihat Detail Kehadiran Siswa ({record.totalSiswa} Siswa)
                        </summary>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2 border-t border-outline-variant pt-2 text-on-surface-variant">
                          {record.siswaDetail?.map((s, sIdx) => {
                            let bulletColor = "bg-emerald-500";
                            if (s.status === "Sakit") bulletColor = "bg-amber-500";
                            if (s.status === "Izin") bulletColor = "bg-blue-500";
                            if (s.status === "Alpa") bulletColor = "bg-red-500";
                            if (s.status === "Bolos") bulletColor = "bg-purple-500";

                            return (
                              <div key={sIdx} className="flex items-center justify-between py-0.5">
                                <span className="truncate pr-2 font-medium">{s.name}</span>
                                <span className="flex items-center gap-1.5 font-bold flex-shrink-0 text-[10px]">
                                  <span className={`w-1.5 h-1.5 rounded-full ${bulletColor}`}></span>
                                  {s.status}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-outline-variant">
                      {record.synced ? (
                        <span className="text-emerald-600 font-label-caps text-label-caps flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                          <span className="material-symbols-outlined text-[18px]">cloud_done</span>
                          Tersinkronisasi
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSyncRecord(record.id)}
                          disabled={isSyncing[record.id]}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-label-caps text-label-caps flex items-center gap-1.5 px-4 py-2 rounded-full transition-colors active:scale-95"
                        >
                          {isSyncing[record.id] ? (
                            <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                          ) : (
                            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                          )}
                          {isSyncing[record.id] ? "Syncing..." : "Sync ke Sheet"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Viewport lock to prevent zooming/pinching and shifting on mobile */}
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>

      {/* Style block for mobile slide-up animations and touch viewport locking */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        html, body {
          overscroll-behavior: none !important;
          width: 100% !important;
          overflow-x: hidden !important;
          position: relative;
        }
      `}} />
    </>
  );
}

export default function PresensiPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen gap-md text-on-surface-variant">
        <span className="material-symbols-outlined text-[48px] animate-spin text-primary">sync</span>
        <p className="font-body-lg text-body-lg">Memuat halaman presensi...</p>
      </div>
    }>
      <PresensiContent />
    </Suspense>
  );
}
