"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const initialStudents = [
  { id: "1234", name: "Annas", class: "7A", nis: "1234" },
  { id: "2345", name: "Ilma", class: "7A", nis: "2345" },
  { id: "3456", name: "Purwo", class: "7B", nis: "3456" },
  { id: "4567", name: "Karin", class: "7B", nis: "4567" },
  { id: "5678", name: "Soleh", class: "7C", nis: "5678" },
  { id: "6789", name: "Rido", class: "7D", nis: "6789" }
];

function RekapContent() {
  const router = useRouter();

  // Core States
  const [riwayat, setRiwayat] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Syncing and Accordion state
  const [isSyncing, setIsSyncing] = useState({}); // { recordId: boolean }
  const [expandedRecord, setExpandedRecord] = useState(null); // ID of expanded record

  // FAB Modal State
  const [showClassModal, setShowClassModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");

  // Toast State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Load from local storage
  useEffect(() => {
    const timer = setTimeout(() => {
      // 1. Get Riwayat
      const storedRiwayat = localStorage.getItem("riwayat_presensi");
      if (storedRiwayat) {
        try {
          const parsed = JSON.parse(storedRiwayat);
          if (Array.isArray(parsed)) {
            setRiwayat(parsed);
          }
        } catch (e) {
          console.error(e);
        }
      }

      // 2. Get Classes dynamically from student database
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
      }
      
      const uniqueClasses = [...new Set(studentList.map(s => s.class).filter(Boolean))].sort();
      setClasses(uniqueClasses);
      if (uniqueClasses.length > 0) {
        setSelectedClass(uniqueClasses[0]);
      }

      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Sync simulation
  const handleSyncRecord = (recordId) => {
    setIsSyncing(prev => ({ ...prev, [recordId]: true }));
    showToast("Menghubungkan ke server Google Sheets...", "info");

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

  // Toggle detail accordion
  const toggleExpand = (recordId) => {
    if (expandedRecord === recordId) {
      setExpandedRecord(null);
    } else {
      setExpandedRecord(recordId);
    }
  };

  // Start attendance redirection
  const handleStartAttendance = () => {
    if (!selectedClass) {
      showToast("Pilih kelas terlebih dahulu!", "error");
      return;
    }
    setShowClassModal(false);
    router.push(`/presensi?kelas=${selectedClass}`);
  };

  // Group records by Date
  const groupedRecords = riwayat.reduce((groups, item) => {
    const date = item.tanggal;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {});

  const dateKeys = Object.keys(groupedRecords).sort((a, b) => {
    // Sort by timestamp of the first item in each group (descending)
    const timeA = groupedRecords[a][0]?.timestamp || 0;
    const timeB = groupedRecords[b][0]?.timestamp || 0;
    return timeB - timeA;
  });

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

      {/* Main Canvas Container */}
      <main className="flex-grow px-container-margin py-md max-w-4xl mx-auto w-full flex flex-col pb-32">
        {/* Header Title */}
        <div className="mb-lg">
          <h2 className="font-display text-display text-primary">Rekap Presensi</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Riwayat presensi kelas harian yang telah direkam dan disimpan di memori lokal.
          </p>
        </div>

        {/* Loading Screen */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-xl gap-md text-on-surface-variant h-80">
            <span className="material-symbols-outlined text-[48px] animate-spin text-primary">sync</span>
            <p className="font-body-lg text-body-lg">Memuat data rekap...</p>
          </div>
        ) : riwayat.length === 0 ? (
          <div className="bg-surface border border-outline-variant rounded-2xl p-xl text-center flex flex-col items-center gap-md">
            <span className="material-symbols-outlined text-[64px] text-on-surface-variant">assessment</span>
            <div>
              <h3 className="font-h2 text-h2 text-on-surface">Belum Ada Riwayat</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-sm max-w-sm">
                Belum ada rekap presensi kelas yang disimpan. Silakan klik tombol "+" di kanan bawah untuk mulai presensi pertama.
              </p>
            </div>
            <button
              onClick={() => setShowClassModal(true)}
              className="bg-primary text-on-primary font-label-caps text-label-caps px-4 py-2.5 rounded-lg shadow-sm hover:bg-primary/95 transition-all flex items-center gap-xs"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Mulai Presensi
            </button>
          </div>
        ) : (
          /* Timeline Grouped List */
          <div className="flex flex-col gap-8">
            {dateKeys.map((date) => (
              <div key={date} className="relative">
                {/* Date Heading Header */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary text-[20px]">calendar_today</span>
                  <h3 className="font-h2 text-h2 font-black text-on-surface">{date}</h3>
                  <div className="h-[1px] bg-outline-variant flex-grow ml-2"></div>
                </div>

                {/* Cards under this date */}
                <div className="flex flex-col gap-4 pl-0 md:pl-6">
                  {groupedRecords[date].map((record) => {
                    const isExpanded = expandedRecord === record.id;
                    return (
                      <div
                        key={record.id}
                        className="bg-surface border border-outline-variant rounded-2xl shadow-sm overflow-hidden transition-all duration-300"
                      >
                        {/* Header card summary view */}
                        <div
                          onClick={() => toggleExpand(record.id)}
                          className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface-container-low transition-colors"
                        >
                          <div className="flex-grow">
                            <div className="flex items-center gap-2">
                              <span className="bg-primary-container text-on-primary-container px-3 py-0.5 rounded text-xs font-black">
                                Kelas {record.kelas}
                              </span>
                              <span className="text-xs font-semibold text-on-surface-variant">
                                {record.totalSiswa} Siswa
                              </span>
                            </div>

                            {/* Rekap metrics counters */}
                            <div className="flex flex-wrap gap-2 mt-3 text-[11px] font-bold">
                              <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">Hadir: {record.rekap.hadir}</span>
                              {record.rekap.sakit > 0 && <span className="bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full">Sakit: {record.rekap.sakit}</span>}
                              {record.rekap.izin > 0 && <span className="bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded-full">Izin: {record.rekap.izin}</span>}
                              {record.rekap.alpa > 0 && <span className="bg-red-50 border border-red-200 text-red-800 px-2 py-0.5 rounded-full">Alpa: {record.rekap.alpa}</span>}
                              {record.rekap.bolos > 0 && <span className="bg-purple-50 border border-purple-200 text-purple-800 px-2 py-0.5 rounded-full">Bolos: {record.rekap.bolos}</span>}
                            </div>
                          </div>

                          {/* Sync Button / Status and expand icon */}
                          <div
                            className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-outline-variant"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {record.synced ? (
                              <span className="text-emerald-600 font-label-caps text-label-caps flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full text-xs">
                                <span className="material-symbols-outlined text-[18px]">cloud_done</span>
                                Tersinkronisasi
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSyncRecord(record.id)}
                                disabled={isSyncing[record.id]}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-label-caps text-label-caps flex items-center gap-1.5 px-4 py-2 rounded-full transition-colors active:scale-95 text-xs font-bold"
                              >
                                {isSyncing[record.id] ? (
                                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                                ) : (
                                  <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                                )}
                                {isSyncing[record.id] ? "Syncing..." : "Sync ke Sheet"}
                              </button>
                            )}
                            
                            {/* Collapse Toggle Chevron Icon */}
                            <button
                              onClick={() => toggleExpand(record.id)}
                              className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-all flex items-center justify-center"
                            >
                              <span className={`material-symbols-outlined transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                                keyboard_arrow_down
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Accordion detail list (collapsed by default) */}
                        {isExpanded && (
                          <div className="border-t border-outline-variant bg-surface-container-lowest p-4 md:p-5 animate-fade-in">
                            <h4 className="font-h3 text-h3 text-on-surface mb-3 border-b border-outline-variant pb-2">Detail Kehadiran Siswa</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-on-surface-variant">
                              {record.siswaDetail?.map((s, idx) => {
                                let bulletColor = "bg-emerald-500";
                                if (s.status === "Sakit") bulletColor = "bg-amber-500";
                                if (s.status === "Izin") bulletColor = "bg-blue-500";
                                if (s.status === "Alpa") bulletColor = "bg-red-500";
                                if (s.status === "Bolos") bulletColor = "bg-purple-500";

                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-low transition-colors"
                                  >
                                    <div className="truncate pr-2">
                                      <span className="font-semibold text-on-surface">{s.name}</span>
                                      {s.nis && <span className="text-[10px] text-on-surface-variant ml-2">({s.nis})</span>}
                                    </div>
                                    <span className="flex items-center gap-1.5 font-bold flex-shrink-0 text-xs">
                                      <span className={`w-2 h-2 rounded-full ${bulletColor}`}></span>
                                      {s.status}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setShowClassModal(true)}
        className="fixed bottom-24 md:bottom-8 right-container-margin md:right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:bg-primary-container hover:shadow-xl transition-all duration-200 z-40 active:scale-95 animate-fade-in"
        title="Mulai Presensi Baru"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      {/* CLASS SELECTION MODAL (Centered Form Modal) */}
      {showClassModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface w-[95%] sm:w-full max-w-2xl rounded-xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-h2 text-h2 text-on-surface font-semibold">Mulai Presensi Baru</h2>
              <button
                onClick={() => setShowClassModal(false)}
                className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                aria-label="Close modal"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto font-body-md text-body-md text-on-surface-variant">
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-label-caps text-on-surface-variant">
                  Pilih Kelas <span className="text-error">*</span>
                </label>
                {classes.length === 0 ? (
                  <p className="text-xs text-error font-semibold">Database siswa kosong. Silakan tambah siswa terlebih dahulu.</p>
                ) : (
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md"
                  >
                    {classes.map((cls) => (
                      <option key={cls} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                  </select>
                )}
                <p className="font-body-md text-body-md text-on-surface-variant mt-2">
                  Pilih kelas yang akan dilakukan perekaman presensi hari ini.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-end gap-sm">
              <button
                type="button"
                onClick={() => setShowClassModal(false)}
                className="px-4 py-2 border border-outline text-on-surface hover:bg-surface-container-high rounded font-label-caps text-label-caps transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleStartAttendance}
                disabled={classes.length === 0}
                className="px-4 py-2 bg-primary text-on-primary rounded font-label-caps text-label-caps shadow-sm hover:bg-primary/95 transition-colors flex items-center gap-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                Mulai Presensi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Style block for mobile slide-up animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        html, body {
          position: relative;
        }
      `}} />
    </>
  );
}

export default function RekapPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen gap-md text-on-surface-variant">
        <span className="material-symbols-outlined text-[48px] animate-spin text-primary">sync</span>
        <p className="font-body-lg text-body-lg">Memuat halaman rekap...</p>
      </div>
    }>
      <RekapContent />
    </Suspense>
  );
}
