"use client";

import { useState, useEffect, useCallback } from "react";

let isJurnalSynced = false;

export default function Home() {
  const [entries, setEntries] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("jurnal_entries");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
    }
    return [];
  });
  const [parsedEntries, setParsedEntries] = useState(entries);
  const [metadata, setMetadata] = useState({
    mataPelajaran: "Matematika",
    kelas: "7A",
    semester: "I",
    tahunAjaran: "2023/2024",
  });
  
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("jurnal_entries");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return false;
          }
        } catch (e) {}
      }
    }
    return true;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Delete Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);

  // Classes list state from localStorage
  const [classesList, setClassesList] = useState([]);

  // Track individual row syncing state
  const [syncingIds, setSyncingIds] = useState({});

  // Form States
  const [dateInput, setDateInput] = useState("");
  const [formData, setFormData] = useState({
    "Hari, tanggal": "",
    "Jam ke-": "1",
    "Kelas": "7A",
    "Materi Pokok": "",
    "Kegiatan Pembelajaran": "",
  });

  // Toast Notification State
  const [toast, setToast] = useState(null);

  // Show toast utility
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  // Format Date to "Hari, tanggal" (Indonesian)
  const formatHariTanggal = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agt",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    const dayName = days[date.getDay()];
    const dayNum = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    return `${dayName}, ${dayNum < 10 ? '0' + dayNum : dayNum} ${monthName} ${year}`;
  };

  const fetchJurnal = useCallback(async (showGlobalSpinner = true) => {
    if (showGlobalSpinner) {
      setIsLoading(true);
    }
    try {
      let localEntries = [];
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("jurnal_entries");
        if (stored) {
          try {
            localEntries = JSON.parse(stored);
          } catch (e) {
            console.error(e);
          }
        }
      }

      const res = await fetch("/api/jurnal");
      if (!res.ok) throw new Error("Gagal mengambil data jurnal");
      const result = await res.json();
      const sheetEntries = result.data || [];

      // Merge sheet entries and local unsynced entries
      const mergedMap = new Map();
      sheetEntries.forEach(item => {
        const rawDate = item["Hari, tanggal"];
        const formattedDate = rawDate && !rawDate.includes(",") ? formatHariTanggal(rawDate) : rawDate;
        mergedMap.set(item.ID, { ...item, "Hari, tanggal": formattedDate, synced: true });
      });
      localEntries.forEach(item => {
        if (!item.synced) {
          mergedMap.set(item.ID, item);
        }
      });

      const merged = Array.from(mergedMap.values());
      if (typeof window !== "undefined") {
        localStorage.setItem("jurnal_entries", JSON.stringify(merged));
      }
      setEntries(merged);
      setParsedEntries(merged);
    } catch (error) {
      console.error(error);
      showToast("Gagal memuat data dari Google Sheet. Menggunakan data lokal.", "error");
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("jurnal_entries");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setEntries(parsed);
            setParsedEntries(parsed);
          } catch (e) {}
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isJurnalSynced) return;
    isJurnalSynced = true;

    const timer = setTimeout(() => {
      let hasCached = false;
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("jurnal_entries");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            hasCached = Array.isArray(parsed) && parsed.length > 0;
          } catch (e) {}
        }
      }
      fetchJurnal(!hasCached);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchJurnal]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("daftar_kelas");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const timer = setTimeout(() => {
              setClassesList(parsed);
            }, 0);
            return () => clearTimeout(timer);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Handle Date picker selection
  const handleDateChange = (e) => {
    const val = e.target.value;
    setDateInput(val);
    if (val) {
      const formatted = formatHariTanggal(val);
      setFormData((prev) => ({ ...prev, "Hari, tanggal": formatted }));
    }
  };

  // Open modal for Creating new entry
  const openCreateModal = () => {
    setModalMode("create");
    setSelectedEntry(null);
    const localToday = new Date();
    const y = localToday.getFullYear();
    const m = String(localToday.getMonth() + 1).padStart(2, '0');
    const d = String(localToday.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    setDateInput(todayStr);
    setFormData({
      "Hari, tanggal": formatHariTanggal(todayStr),
      "Jam ke-": "1",
      "Kelas": classesList[0] || "7A",
      "Materi Pokok": "",
      "Kegiatan Pembelajaran": "",
    });
    setIsModalOpen(true);
  };

  // Open modal for Editing entry
  const openEditModal = (entry) => {
    setModalMode("edit");
    setSelectedEntry(entry);
    setFormData({
      "Hari, tanggal": entry["Hari, tanggal"] || "",
      "Jam ke-": entry["Jam ke-"] ? entry["Jam ke-"].toString() : "1",
      "Kelas": entry["Kelas"] || classesList[0] || "7A",
      "Materi Pokok": entry["Materi Pokok"] || "",
      "Kegiatan Pembelajaran": entry["Kegiatan Pembelajaran"] || "",
    });
    setDateInput("");
    setIsModalOpen(true);
  };

  // Submit form (Save Locally)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData["Hari, tanggal"] || !formData["Materi Pokok"]) {
      showToast("Kolom Hari/Tanggal dan Materi Pokok wajib diisi!", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === "create") {
        const newEntry = {
          ID: crypto.randomUUID(),
          "Hari, tanggal": formData["Hari, tanggal"],
          "Jam ke-": formData["Jam ke-"],
          "Kelas": formData["Kelas"],
          "Materi Pokok": formData["Materi Pokok"],
          "Kegiatan Pembelajaran": formData["Kegiatan Pembelajaran"],
          synced: false
        };
        const updated = [newEntry, ...entries];
        setEntries(updated);
        setParsedEntries(updated);
        if (typeof window !== "undefined") {
          localStorage.setItem("jurnal_entries", JSON.stringify(updated));
        }
        showToast("Jurnal disimpan secara lokal!");
      } else {
        const updated = entries.map((entry) => {
          const entryId = selectedEntry.ID || selectedEntry._rowNum;
          const matchId = entry.ID || entry._rowNum;
          if (matchId === entryId) {
            return {
              ...entry,
              "Hari, tanggal": formData["Hari, tanggal"],
              "Jam ke-": formData["Jam ke-"],
              "Kelas": formData["Kelas"],
              "Materi Pokok": formData["Materi Pokok"],
              "Kegiatan Pembelajaran": formData["Kegiatan Pembelajaran"],
              synced: false
            };
          }
          return entry;
        });
        setEntries(updated);
        setParsedEntries(updated);
        if (typeof window !== "undefined") {
          localStorage.setItem("jurnal_entries", JSON.stringify(updated));
        }
        showToast("Perubahan disimpan secara lokal!");
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      showToast("Gagal menyimpan jurnal.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Jurnal Delete Confirmation Modal
  const openDeleteModal = (entry) => {
    setEntryToDelete(entry);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setEntryToDelete(null);
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;
    const id = entryToDelete.ID;
    
    // Remove locally
    const updated = entries.filter((e) => e.ID !== id);
    setEntries(updated);
    setParsedEntries(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("jurnal_entries", JSON.stringify(updated));
    }

    if (entryToDelete.synced) {
      try {
        const res = await fetch(`/api/jurnal?id=${id || entryToDelete._rowNum}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Gagal menghapus jurnal di sheet");
        showToast("Jurnal berhasil dihapus dari Google Sheet!");
      } catch (error) {
        console.error(error);
        showToast("Gagal menghapus di Google Sheet, tetapi dihapus secara lokal.", "warning");
      }
    } else {
      showToast("Jurnal berhasil dihapus secara lokal!", "success");
    }
    closeDeleteModal();
  };

  // Sync individual row to Apps Script
  const handleSyncEntry = async (entry) => {
    const id = entry.ID;
    setSyncingIds(prev => ({ ...prev, [id]: true }));

    try {
      const payload = {
        "Hari, tanggal": entry["Hari, tanggal"],
        "Jam ke-": entry["Jam ke-"],
        "Kelas": entry["Kelas"],
        "Materi Pokok": entry["Materi Pokok"],
        "Kegiatan Pembelajaran": entry["Kegiatan Pembelajaran"]
      };

      let res;
      if (entry._rowNum) {
        res = await fetch("/api/jurnal", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: entry.ID, data: payload }),
        });
      } else {
        res = await fetch("/api/jurnal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ID: entry.ID, ...payload }),
        });
      }

      if (!res.ok) throw new Error("Gagal menyinkronkan data jurnal");
      
      // Update local storage and state to synced: true
      const updated = entries.map(e => e.ID === id ? { ...e, synced: true } : e);
      setEntries(updated);
      setParsedEntries(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("jurnal_entries", JSON.stringify(updated));
      }

      showToast("Jurnal berhasil disinkronkan ke Google Sheet!");
      await fetchJurnal(false);
    } catch (e) {
      console.error(e);
      showToast("Gagal sinkronisasi data ke Google Sheets.", "error");
    } finally {
      setSyncingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  // Filter entries based on search
  const filteredEntries = parsedEntries.filter((entry) => {
    const query = searchQuery.toLowerCase();
    return (
      (entry["Hari, tanggal"] || "").toLowerCase().includes(query) ||
      (entry["Materi Pokok"] || "").toLowerCase().includes(query) ||
      (entry["Kegiatan Pembelajaran"] || "").toLowerCase().includes(query) ||
      (entry["Kelas"] || "").toLowerCase().includes(query)
    );
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

      {/* Main Canvas */}
      <main className="flex-grow px-container-margin py-md max-w-7xl mx-auto w-full">
        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-gutter mb-lg">
          <div className="relative flex-grow">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              className="w-full bg-surface border border-outline rounded p-3 pl-10 font-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-on-surface-variant"
              placeholder="Cari jurnal atau materi..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-sm">
            <button
              onClick={() => showToast("Urutkan tanggal akan segera hadir!", "info")}
              className="bg-surface border border-outline rounded p-3 text-on-surface-variant flex items-center gap-xs hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">calendar_today</span>
              <span className="font-label-caps text-label-caps hidden sm:inline">Tanggal</span>
            </button>
            <button
              onClick={() => showToast("Filter kelas akan segera hadir!", "info")}
              className="bg-surface border border-outline rounded p-3 text-on-surface-variant flex items-center gap-xs hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">filter_list</span>
              <span className="font-label-caps text-label-caps hidden sm:inline">Kelas</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-xl gap-md text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] animate-spin text-primary">sync</span>
            <p className="font-body-lg text-body-lg">Memuat data...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-primary text-[32px] mt-1">history_edu</span>
              <div>
                <h3 className="font-h3 text-h3 font-semibold text-on-surface">Belum Ada Catatan Jurnal</h3>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  {searchQuery
                    ? "Tidak ditemukan jurnal yang cocok dengan kata kunci pencarian Anda."
                    : "Mulai mengisi jurnal mengajar harian Anda dengan menekan tombol '+' di kanan bawah."}
                </p>
              </div>
            </div>
            {!searchQuery && (
              <button
                onClick={openCreateModal}
                className="bg-primary text-on-primary font-label-caps text-label-caps px-4 py-2.5 rounded-lg shadow-sm hover:bg-primary/95 transition-all flex items-center gap-xs cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Buat Entri Pertama
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile/Tablet Card View (lg:hidden) */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-gutter">
              {filteredEntries.map((entry, idx) => (
                <div
                  key={entry.ID || entry._rowNum || idx}
                  onClick={() => openEditModal(entry)}
                  className="bg-surface border border-outline-variant rounded-lg p-md shadow-sm hover:border-primary transition-colors cursor-pointer relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start mb-sm">
                    <div className="flex items-center gap-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-[18px]">event</span>
                      <span className="font-caption text-caption">{entry["Hari, tanggal"]}</span>
                    </div>
                    <span className="bg-secondary-container text-on-secondary-container font-label-caps text-label-caps px-2 py-0.5 rounded text-xs">
                      {entry["Jam ke-"] ? `Jam ${entry["Jam ke-"]}` : "-"}
                    </span>
                  </div>
                  <div className="mb-sm">
                    <h3 className="font-h3 text-h3 text-on-surface mb-xs">{entry["Materi Pokok"]}</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">
                      {entry["Kegiatan Pembelajaran"] || "-"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-outline-variant pt-sm mt-sm">
                    <div className="font-caption text-caption text-secondary flex items-center gap-2">
                      <span>Kelas {entry["Kelas"]}</span>
                      {entry.synced ? (
                        <span className="text-emerald-600 flex items-center gap-0.5 text-[10px]">
                          <span className="material-symbols-outlined text-[14px]">cloud_done</span>
                          Ok
                        </span>
                      ) : syncingIds[entry.ID] ? (
                        <span className="text-amber-500 flex items-center gap-0.5 text-[10px]">
                          <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                          Syncing...
                        </span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-0.5 text-[10px] animate-pulse">
                          <span className="material-symbols-outlined text-[14px]">cloud_queue</span>
                          Belum Sync
                        </span>
                      )}
                    </div>
                    <div className="flex gap-sm items-center" onClick={(e) => e.stopPropagation()}>
                      {!entry.synced && (
                        <button
                          onClick={() => handleSyncEntry(entry)}
                          disabled={syncingIds[entry.ID]}
                          className="text-amber-500 hover:bg-amber-50 p-1 rounded-full transition-colors flex items-center justify-center disabled:opacity-50"
                          title="Sinkronisasi ke Sheet"
                        >
                          <span className={`material-symbols-outlined text-[18px] ${syncingIds[entry.ID] ? "animate-spin" : ""}`}>
                            {syncingIds[entry.ID] ? "sync" : "cloud_upload"}
                          </span>
                        </button>
                      )}
                      <button
                        onClick={() => openDeleteModal(entry)}
                        className="text-error hover:bg-error-container/20 p-1 rounded-full transition-colors flex items-center justify-center"
                        title="Hapus Jurnal"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Data Table View (hidden lg:block) */}
            <div className="hidden lg:block bg-surface border border-outline-variant rounded-lg overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse min-w-[650px] xl:min-w-[900px]">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant w-12 xl:w-16 text-center">
                      No
                    </th>
                    <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant w-36 xl:w-48">
                      Hari/Tanggal
                    </th>
                    <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant w-16 xl:w-24">
                      Jam ke-
                    </th>
                    <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant w-16 xl:w-28">
                      Kelas
                    </th>
                    <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant w-40 xl:w-48">
                      Materi Pokok
                    </th>
                    <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant hidden xl:table-cell">
                      Kegiatan Pembelajaran
                    </th>
                    <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant w-24 xl:w-32 text-center">
                      Status
                    </th>
                    <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant w-16 xl:w-24 text-center">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-body-md text-on-surface">
                  {filteredEntries.map((entry, idx) => (
                    <tr
                      key={entry.ID || entry._rowNum || idx}
                      onClick={() => openEditModal(entry)}
                      className={`border-b border-outline-variant hover:bg-surface-container-highest transition-colors cursor-pointer ${
                        idx % 2 === 1 ? "bg-surface-bright" : ""
                      }`}
                    >
                      <td className="py-3 px-4 text-center text-on-surface-variant">{idx + 1}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{entry["Hari, tanggal"]}</td>
                      <td className="py-3 px-4">
                        <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded text-xs font-semibold">
                          {entry["Jam ke-"] || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4">{entry["Kelas"]}</td>
                      <td className="py-3 px-4 font-semibold">{entry["Materi Pokok"]}</td>
                      <td className="py-3 px-4 text-on-surface-variant truncate max-w-[200px] hidden xl:table-cell" title={entry["Kegiatan Pembelajaran"]}>
                        {entry["Kegiatan Pembelajaran"] || "-"}
                      </td>
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {entry.synced ? (
                          <span className="text-emerald-600 inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                            <span className="material-symbols-outlined text-[16px]">cloud_done</span>
                            Ok
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSyncEntry(entry)}
                            disabled={syncingIds[entry.ID]}
                            className="bg-amber-500 hover:bg-amber-600 text-white inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-all active:scale-95 text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                          >
                            {syncingIds[entry.ID] ? (
                              <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                            ) : (
                              <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                            )}
                            {syncingIds[entry.ID] ? "Syncing..." : "Sync"}
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-xs">
                          <button
                            onClick={() => openEditModal(entry)}
                            className="text-primary hover:bg-surface-container-high p-1 rounded-full active:opacity-80 transition-all cursor-pointer"
                            title="Edit Jurnal"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button
                            onClick={() => openDeleteModal(entry)}
                            className="text-error hover:bg-error-container/20 p-1 rounded-full active:opacity-80 transition-all cursor-pointer"
                            title="Hapus Jurnal"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={openCreateModal}
        className="fixed bottom-24 right-container-margin md:bottom-lg bg-primary-container text-on-primary-container w-14 h-14 rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all z-40 group"
      >
        <span className="material-symbols-outlined text-[28px] group-hover:rotate-90 transition-transform duration-300">
          add
        </span>
      </button>

      {/* CRUD MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-surface w-[95%] sm:w-full max-w-2xl rounded-xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-h2 text-h2 text-on-surface font-semibold">
                {modalMode === "create" ? "Tambah Jurnal Mengajar" : "Edit Jurnal Mengajar"}
              </h2>
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
              <form id="jurnalForm" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date Helper Picker & Input */}
                  <div className="flex flex-col gap-xs md:col-span-2">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">
                      Hari, tanggal <span className="text-error">*</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="date"
                        value={dateInput}
                        onChange={handleDateChange}
                        className="bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md w-full sm:w-auto"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Senin, 12 Okt 2023"
                        value={formData["Hari, tanggal"]}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, "Hari, tanggal": e.target.value }))
                        }
                        className="flex-grow bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md"
                      />
                    </div>
                    <p className="font-caption text-caption text-on-surface-variant mt-1">
                      Pilih penanggalan tanggal di sebelah kiri untuk otomatisasi hari, atau ketik langsung di kolom teks.
                    </p>
                  </div>

                  {/* Jam Ke- */}
                  <div className="flex flex-col gap-xs">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">
                      Jam ke-
                    </label>
                    <select
                      value={formData["Jam ke-"] || "1"}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, "Jam ke-": e.target.value }))
                      }
                      className="w-full bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <option key={num} value={num.toString()}>
                          Jam ke-{num}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Kelas Selection */}
                  <div className="flex flex-col gap-xs">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">
                      Kelas <span className="text-error">*</span>
                    </label>
                    <select
                      required
                      value={formData["Kelas"]}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, "Kelas": e.target.value }))
                      }
                      className="w-full bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md"
                    >
                      {classesList.map((cls) => (
                        <option key={cls} value={cls}>
                          Kelas {cls}
                        </option>
                      ))}
                    </select>
                  </div>



                  {/* Materi Pokok */}
                  <div className="flex flex-col gap-xs md:col-span-2">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">
                      Materi Pokok <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Aljabar Linier Dasar"
                      value={formData["Materi Pokok"]}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, "Materi Pokok": e.target.value }))
                      }
                      className="w-full bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md"
                    />
                  </div>

                  {/* Kegiatan Pembelajaran */}
                  <div className="flex flex-col gap-xs md:col-span-2">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">
                      Kegiatan Pembelajaran
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Deskripsikan aktivitas pengajaran di kelas..."
                      value={formData["Kegiatan Pembelajaran"]}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, "Kegiatan Pembelajaran": e.target.value }))
                      }
                      className="w-full bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md resize-none"
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
                form="jurnalForm"
                className="px-4 py-2 bg-primary text-on-primary rounded font-label-caps text-label-caps shadow-sm hover:bg-primary/95 transition-colors flex items-center gap-xs cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                )}
                {modalMode === "create" ? "Simpan Jurnal" : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-surface w-[95%] sm:w-full max-w-2xl rounded-xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-h2 text-h2 text-on-surface font-semibold">Hapus Catatan Jurnal</h2>
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
                Apakah Anda yakin ingin menghapus catatan jurnal ini?
              </p>
              {entryToDelete && (
                <p className="font-body-md text-body-md text-on-surface-variant mt-2">
                  Catatan jurnal materi <strong className="text-on-surface">{entryToDelete["Materi Pokok"]}</strong> pada tanggal <strong className="text-on-surface">{entryToDelete["Hari, tanggal"]}</strong> akan dihapus secara permanen.
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
    </>
  );
}
