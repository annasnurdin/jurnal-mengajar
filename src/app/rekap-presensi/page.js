"use client";

import { useState, useEffect, useRef, Suspense } from "react";
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
  const [riwayat, setRiwayat] = useState([]); // List of daily records: { id, tanggal, classesList: [...], synced }
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Syncing and Accordion state
  const [isSyncing, setIsSyncing] = useState({}); // { recordId: boolean }
  const [expandedRecord, setExpandedRecord] = useState(null); // ID of expanded daily record

  // FAB Modal State
  const [showClassModal, setShowClassModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");

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

  // Convert a daily record's classesList to a single formatted string for Google Sheet
  const formatKehadiran = (record) => {
    if (!record.classesList || record.classesList.length === 0) return "";
    return record.classesList
      .map(c => {
        const studentStatusList = (c.siswaDetail || [])
          .map(s => `${s.name} (${s.status})`)
          .join(", ");
        return `Kelas ${c.kelas}: ${studentStatusList}`;
      })
      .join("\n");
  };

  // Parse Google Sheets Kehadiran cell back into classesList array
  const parseKehadiranString = (kehadiranStr) => {
    if (!kehadiranStr) return [];
    const lines = kehadiranStr.split("\n").filter(Boolean);
    return lines.map((line, idx) => {
      // line format: "Kelas 7A: Annas (Hadir), Ilma (Hadir)"
      const parts = line.split(":");
      const header = parts[0] || ""; // "Kelas 7A"
      const body = parts.slice(1).join(":") || ""; // " Annas (Hadir), Ilma (Hadir)"
      
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

  // Auto-sync previous day's records and empty them from localStorage
  const handleAutoSyncAndClean = async (recordsList) => {
    const todayStr = getIndonesianDate(new Date());
    
    // 1. Filter records from previous days
    const oldRecords = recordsList.filter(r => r.tanggal !== todayStr);
    if (oldRecords.length === 0) return;
    
    // 2. Filter unsynced old records
    const unsyncedOld = oldRecords.filter(r => !r.synced);
    
    if (unsyncedOld.length > 0) {
      showToast(`Mendeteksi ganti hari. Menyinkronkan otomatis ${unsyncedOld.length} data kemarin...`, "info");
      
      let successCount = 0;
      const updatedList = [...recordsList];
      
      for (const record of unsyncedOld) {
        try {
          const kehadiranStr = formatKehadiran(record);
          const res = await fetch("/api/presensi", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tanggal: record.tanggal,
              kehadiran: kehadiranStr,
              kelas: "" // No class parameter for overwrite day sync
            }),
          });
          
          if (res.ok) {
            const resData = await res.json().catch(() => ({}));
            if (!resData.error) {
              const foundIdx = updatedList.findIndex(item => item.id === record.id);
              if (foundIdx !== -1) {
                updatedList[foundIdx].synced = true;
              }
              successCount++;
            }
          }
        } catch (e) {
          console.error(`Auto-sync failed for day ${record.tanggal}:`, e);
        }
      }
      
      // Keep today's records OR any records that failed to sync
      const cleanedList = updatedList.filter(r => r.tanggal === todayStr || !r.synced);
      setRiwayat(cleanedList);
      localStorage.setItem("riwayat_presensi", JSON.stringify(cleanedList));
      
      if (successCount > 0) {
        showToast(`Auto-sync selesai. ${successCount} hari riwayat lama berhasil disinkronkan & dikosongkan.`, "success");
      }
    } else {
      // If all previous day's records are already synced, clear them from localStorage
      const cleanedList = recordsList.filter(r => r.tanggal === todayStr);
      if (cleanedList.length !== recordsList.length) {
        setRiwayat(cleanedList);
        localStorage.setItem("riwayat_presensi", JSON.stringify(cleanedList));
        showToast("Riwayat hari sebelumnya telah dikosongkan dari memori lokal.", "info");
      }
    }
  };

  const hasLoaded = useRef(false);

  // Fetch from Google Sheet and merge with localStorage
  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    const loadAndMergeData = async () => {
      const todayStr = getIndonesianDate(new Date());

      // 1. Load Local Records
      let localRecords = [];
      const storedRiwayat = localStorage.getItem("riwayat_presensi");
      if (storedRiwayat) {
        try {
          const parsed = JSON.parse(storedRiwayat);
          if (Array.isArray(parsed)) {
            localRecords = parsed;
          }
        } catch (e) {
          console.error(e);
        }
      }

      // 2. Fetch Sheet Records from Google Sheet (ONLY IF LOCAL IS EMPTY!)
      let sheetRecords = [];
      const shouldFetch = localRecords.length === 0;

      if (shouldFetch) {
        try {
          const res = await fetch("/api/presensi");
          if (res.ok) {
            const resData = await res.json();
            if (resData && Array.isArray(resData.data)) {
              sheetRecords = resData.data.map((item, idx) => ({
                id: `sheet_day_${idx}_${Date.now()}`,
                tanggal: item.Tanggal,
                classesList: parseKehadiranString(item.Kehadiran),
                synced: true
              }));
            }
          }
        } catch (err) {
          console.error("Gagal mengambil data dari Google Sheets:", err);
        }
      }

      // 3. Merge Local and Sheet records
      let mergedRecords = shouldFetch ? [...sheetRecords] : [...localRecords];

      if (shouldFetch) {
        localRecords.forEach(localRec => {
          const foundIdx = mergedRecords.findIndex(r => r.tanggal === localRec.tanggal);
          if (foundIdx !== -1) {
            // Date already exists in Sheet!
            if (localRec.tanggal === todayStr) {
              // For today, merge class lists to preserve local changes
              const sheetClasses = [...mergedRecords[foundIdx].classesList];
              (localRec.classesList || []).forEach(localClass => {
                const classIdx = sheetClasses.findIndex(c => c.kelas === localClass.kelas);
                if (classIdx !== -1) {
                  sheetClasses[classIdx] = localClass; // Local overrides sheet
                } else {
                  sheetClasses.push(localClass);
                }
              });
              mergedRecords[foundIdx] = {
                ...mergedRecords[foundIdx],
                classesList: sheetClasses,
                synced: localRec.synced // Inherit local unsynced status
              };
            }
          } else {
            // Date does not exist in Sheet, add local record
            mergedRecords.push(localRec);
          }
        });
      }

      // Sort by date (we can sort based on the timestamp or array order)
      mergedRecords.sort((a, b) => {
        // Fallback sorting
        return b.tanggal.localeCompare(a.tanggal);
      });

      setRiwayat(mergedRecords);
      localStorage.setItem("riwayat_presensi", JSON.stringify(mergedRecords));

      // 4. Load classes from students database for modal FAB dropdown
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

      // 5. Trigger Auto-Sync and Clean
      if (mergedRecords.length > 0) {
        handleAutoSyncAndClean(mergedRecords);
      }
    };

    loadAndMergeData();
  }, []);

  // Real Sync to Google Sheets (Saves all classes of the day into 1 row)
  const handleSyncRecord = async (recordId) => {
    const record = riwayat.find(item => item.id === recordId);
    if (!record) return;

    setIsSyncing(prev => ({ ...prev, [recordId]: true }));
    showToast("Menghubungkan ke server Google Sheets...", "info");

    try {
      const kehadiranStr = formatKehadiran(record);
      const res = await fetch("/api/presensi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tanggal: record.tanggal,
          kehadiran: kehadiranStr,
          kelas: "" // Overwrites the whole row for that date
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Gagal menyinkronkan data presensi");
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const updated = riwayat.map(item => {
        if (item.id === recordId) {
          return { ...item, synced: true };
        }
        return item;
      });

      setRiwayat(updated);
      localStorage.setItem("riwayat_presensi", JSON.stringify(updated));
      showToast("Data presensi berhasil disinkronkan ke Google Sheet!");
    } catch (e) {
      console.error(e);
      showToast(e.message || "Gagal melakukan sinkronisasi.", "error");
    } finally {
      setIsSyncing(prev => ({ ...prev, [recordId]: false }));
    }
  };

  const toggleExpand = (recordId) => {
    if (expandedRecord === recordId) {
      setExpandedRecord(null);
    } else {
      setExpandedRecord(recordId);
    }
  };

  const handleStartAttendance = () => {
    if (!selectedClass) {
      showToast("Pilih kelas terlebih dahulu!", "error");
      return;
    }
    setShowClassModal(false);
    router.push(`/presensi?kelas=${selectedClass}`);
  };

  // Helper to calculate aggregate stats for a daily record
  const getAggregateStats = (classesList) => {
    const totals = { hadir: 0, sakit: 0, izin: 0, alpa: 0, bolos: 0, totalSiswa: 0 };
    if (!classesList) return totals;
    classesList.forEach(c => {
      totals.hadir += c.rekap.hadir;
      totals.sakit += c.rekap.sakit;
      totals.izin += c.rekap.izin;
      totals.alpa += c.rekap.alpa;
      totals.bolos += c.rekap.bolos;
      totals.totalSiswa += c.totalSiswa;
    });
    return totals;
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

      {/* Main Canvas Container */}
      <main className="flex-grow px-container-margin py-md max-w-4xl mx-auto w-full flex flex-col pb-32">
        {/* Header Title */}
        <div className="mb-lg">
          <h2 className="font-display text-display text-primary">Rekap Presensi</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Riwayat presensi harian yang disinkronkan ke Google Sheet (1 baris per hari).
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
                Belum ada rekap presensi yang disimpan. Silakan klik tombol "+" di kanan bawah untuk mulai presensi.
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
          /* Daily Record Cards List */
          <div className="flex flex-col gap-6">
            {riwayat.map((record) => {
              const isExpanded = expandedRecord === record.id;
              const stats = getAggregateStats(record.classesList);
              const classesTaught = (record.classesList || []).map(c => c.kelas).join(", ");

              return (
                <div
                  key={record.id}
                  className="bg-surface border border-outline-variant rounded-2xl shadow-sm overflow-hidden transition-all duration-300"
                >
                  {/* Card Header Section */}
                  <div
                    onClick={() => toggleExpand(record.id)}
                    className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface-container-low transition-colors"
                  >
                    <div className="flex-grow">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">calendar_today</span>
                        <span className="font-h3 text-h3 font-black text-on-surface">
                          {record.tanggal}
                        </span>
                        <span className="bg-primary-container text-on-primary-container px-2 py-0.5 rounded text-[10px] font-black ml-2">
                          {record.classesList?.length || 0} Kelas ({classesTaught || "-"})
                        </span>
                      </div>

                      {/* Day's Aggregate Counters */}
                      <div className="flex flex-wrap gap-2 mt-3 text-[11px] font-bold">
                        <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">Hadir: {stats.hadir}</span>
                        {stats.sakit > 0 && <span className="bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full">Sakit: {stats.sakit}</span>}
                        {stats.izin > 0 && <span className="bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded-full">Izin: {stats.izin}</span>}
                        {stats.alpa > 0 && <span className="bg-red-50 border border-red-200 text-red-800 px-2 py-0.5 rounded-full">Alpa: {stats.alpa}</span>}
                        {stats.bolos > 0 && <span className="bg-purple-50 border border-purple-200 text-purple-800 px-2 py-0.5 rounded-full">Bolos: {stats.bolos}</span>}
                      </div>
                    </div>

                    {/* Single Sync Button and expand chevron */}
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

                  {/* Accordion Detail View: Grouped by class */}
                  {isExpanded && (
                    <div className="border-t border-outline-variant bg-surface-container-lowest p-4 md:p-5 flex flex-col gap-6 animate-fade-in">
                      {record.classesList?.map((classRec, idx) => (
                        <div key={idx} className="border border-outline-variant rounded-xl p-4 bg-surface">
                          <div className="flex items-center justify-between border-b border-outline-variant pb-2 mb-3">
                            <span className="bg-secondary-container text-on-secondary-container px-3 py-0.5 rounded text-xs font-black">
                              Kelas {classRec.kelas}
                            </span>
                            <span className="text-xs font-semibold text-on-surface-variant">
                              {classRec.totalSiswa} Siswa
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-on-surface-variant">
                            {classRec.siswaDetail?.map((s, sIdx) => {
                              let bulletColor = "bg-emerald-500";
                              if (s.status === "Sakit") bulletColor = "bg-amber-500";
                              if (s.status === "Izin") bulletColor = "bg-blue-500";
                              if (s.status === "Alpa") bulletColor = "bg-red-500";
                              if (s.status === "Bolos") bulletColor = "bg-purple-500";

                              return (
                                <div
                                  key={sIdx}
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
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
