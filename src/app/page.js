"use client";

import { useState, useEffect } from "react";

const initialDummyData = [
  {
    _rowNum: 1,
    "Hari, tanggal": "Senin, 12 Okt 2023",
    "Jam ke-": "1-2",
    "Kelas": "7A",
    "Materi Pokok": "Aljabar Linier Dasar",
    "Kegiatan Pembelajaran": "Pengenalan konsep variabel dan persamaan linear satu variabel beserta contoh aplikasinya dalam kehidupan sehari-hari.",
    "Kehadiran": "H:30, A:2"
  },
  {
    _rowNum: 2,
    "Hari, tanggal": "Senin, 12 Okt 2023",
    "Jam ke-": "4-5",
    "Kelas": "8C",
    "Materi Pokok": "Statistika Dasar",
    "Kegiatan Pembelajaran": "Praktik pengumpulan data di lapangan dan penyusunan tabel distribusi frekuensi tunggal.",
    "Kehadiran": "H:32, I:1"
  },
  {
    _rowNum: 3,
    "Hari, tanggal": "Jumat, 09 Okt 2023",
    "Jam ke-": "1-2",
    "Kelas": "7A",
    "Materi Pokok": "Review UTS",
    "Kegiatan Pembelajaran": "Membahas soal-soal Ujian Tengah Semester yang banyak salah dijawab oleh siswa.",
    "Kehadiran": "H:32"
  }
];

export default function Home() {
  const [entries, setEntries] = useState([]);
  const [parsedEntries, setParsedEntries] = useState([]);
  const [metadata, setMetadata] = useState({
    mataPelajaran: "Matematika",
    kelas: "7A",
    semester: "I",
    tahunAjaran: "2023/2024",
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Form States
  const [dateInput, setDateInput] = useState("");
  const [formData, setFormData] = useState({
    "Hari, tanggal": "",
    "Jam ke-": "",
    "Kelas": "7A",
    "Materi Pokok": "",
    "Kegiatan Pembelajaran": "",
    "Kehadiran": "",
  });

  // Toast Notification State
  const [toast, setToast] = useState(null);

  // Show toast utility
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
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

  // Parse attendance string into structured badges
  const parseKehadiran = (str) => {
    if (!str) return [];
    const badges = [];
    const hMatch = str.match(/H\s*:\s*(\d+)/i) || str.match(/Hadir\s*:\s*(\d+)/i);
    const sMatch = str.match(/S\s*:\s*(\d+)/i) || str.match(/Sakit\s*:\s*(\d+)/i);
    const iMatch = str.match(/I\s*:\s*(\d+)/i) || str.match(/Izin\s*:\s*(\d+)/i);
    const aMatch = str.match(/A\s*:\s*(\d+)/i) || str.match(/Alpa\s*:\s*(\d+)/i) || str.match(/Absen\s*:\s*(\d+)/i);

    if (hMatch) badges.push({ label: `H:${hMatch[1]}`, type: "hadir", title: "Hadir" });
    if (sMatch) badges.push({ label: `S:${sMatch[1]}`, type: "sakit", title: "Sakit" });
    if (iMatch) badges.push({ label: `I:${iMatch[1]}`, type: "izin", title: "Izin" });
    if (aMatch) badges.push({ label: `A:${aMatch[1]}`, type: "alpa", title: "Alpa" });

    if (badges.length === 0) {
      badges.push({ label: str, type: "default", title: "Kehadiran" });
    }
    return badges;
  };

  const renderKehadiranBadges = (str) => {
    if (!str) return <span className="text-on-surface-variant font-caption text-caption">Tidak tercatat</span>;
    const badges = parseKehadiran(str);
    return (
      <div className="flex gap-xs flex-wrap justify-center md:justify-start">
        {badges.map((badge, idx) => {
          let badgeClass = "bg-surface-container-low border border-outline-variant text-on-surface";
          if (badge.type === "alpa") {
            badgeClass = "bg-error-container text-on-error-container";
          } else if (badge.type === "sakit") {
            badgeClass = "bg-secondary-container text-on-secondary-container";
          } else if (badge.type === "izin") {
            badgeClass = "bg-tertiary-container text-on-tertiary-container";
          }
          return (
            <span
              key={idx}
              className={`${badgeClass} text-[10px] px-1.5 py-0.5 rounded-full font-semibold`}
              title={badge.title}
            >
              {badge.label}
            </span>
          );
        })}
      </div>
    );
  };

  // Simulate server fetch on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setEntries(initialDummyData);
      setParsedEntries(initialDummyData);
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
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
    setDateInput("");
    setFormData({
      "Hari, tanggal": "",
      "Jam ke-": "",
      "Kelas": "7A",
      "Materi Pokok": "",
      "Kegiatan Pembelajaran": "",
      "Kehadiran": "",
    });
    setIsModalOpen(true);
  };

  // Open modal for Editing entry
  const openEditModal = (entry) => {
    setModalMode("edit");
    setSelectedEntry(entry);
    setFormData({
      "Hari, tanggal": entry["Hari, tanggal"] || "",
      "Jam ke-": entry["Jam ke-"] || "",
      "Kelas": entry["Kelas"] || "7A",
      "Materi Pokok": entry["Materi Pokok"] || "",
      "Kegiatan Pembelajaran": entry["Kegiatan Pembelajaran"] || "",
      "Kehadiran": entry["Kehadiran"] || "",
    });
    setDateInput("");
    setIsModalOpen(true);
  };

  // Submit form (Create or Update Locally)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData["Hari, tanggal"] || !formData["Materi Pokok"]) {
      showToast("Kolom Hari/Tanggal dan Materi Pokok wajib diisi!", "error");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      if (modalMode === "create") {
        const newEntry = {
          _rowNum: entries.length > 0 ? Math.max(...entries.map(e => e._rowNum)) + 1 : 1,
          "Hari, tanggal": formData["Hari, tanggal"],
          "Jam ke-": formData["Jam ke-"],
          "Kelas": formData["Kelas"],
          "Materi Pokok": formData["Materi Pokok"],
          "Kegiatan Pembelajaran": formData["Kegiatan Pembelajaran"],
          "Kehadiran": formData["Kehadiran"],
        };
        const updated = [...entries, newEntry];
        setEntries(updated);
        setParsedEntries(updated);
        showToast("Jurnal berhasil ditambahkan!");
      } else {
        // Edit mode
        const updated = entries.map((entry) => {
          if (entry._rowNum === selectedEntry._rowNum) {
            return {
              ...entry,
              "Hari, tanggal": formData["Hari, tanggal"],
              "Jam ke-": formData["Jam ke-"],
              "Kelas": formData["Kelas"],
              "Materi Pokok": formData["Materi Pokok"],
              "Kegiatan Pembelajaran": formData["Kegiatan Pembelajaran"],
              "Kehadiran": formData["Kehadiran"],
            };
          }
          return entry;
        });
        setEntries(updated);
        setParsedEntries(updated);
        showToast("Jurnal berhasil diperbarui!");
      }
      setIsModalOpen(false);
      setIsSubmitting(false);
    }, 400);
  };

  // Delete an entry locally
  const handleDelete = async (entry) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus jurnal pada ${entry["Hari, tanggal"]}?`)) {
      return;
    }
    const updated = entries.filter((e) => e._rowNum !== entry._rowNum);
    setEntries(updated);
    setParsedEntries(updated);
    showToast("Jurnal berhasil dihapus!", "success");
  };

  // Filter entries based on search
  const filteredEntries = parsedEntries.filter((entry) => {
    const query = searchQuery.toLowerCase();
    return (
      (entry["Hari, tanggal"] || "").toLowerCase().includes(query) ||
      (entry["Materi Pokok"] || "").toLowerCase().includes(query) ||
      (entry["Kegiatan Pembelajaran"] || "").toLowerCase().includes(query) ||
      (entry["Kehadiran"] || "").toLowerCase().includes(query) ||
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
        
        {/* Dashboard Analytics / Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-lg">
          <div className="bg-surface border border-outline-variant rounded-lg p-md shadow-sm flex items-center justify-between">
            <div>
              <p className="font-label-caps text-label-caps text-on-surface-variant">Total Entri</p>
              <p className="font-display text-display text-primary mt-xs">{parsedEntries.length}</p>
            </div>
            <div className="h-12 w-12 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined">history_edu</span>
            </div>
          </div>
          
          <div className="bg-surface border border-outline-variant rounded-lg p-md shadow-sm flex items-center justify-between">
            <div>
              <p className="font-label-caps text-label-caps text-on-surface-variant">Update Terakhir</p>
              <p className="font-h3 text-h3 text-on-surface mt-sm">
                {parsedEntries.length > 0 ? parsedEntries[parsedEntries.length - 1]["Hari, tanggal"] : "-"}
              </p>
            </div>
            <div className="h-12 w-12 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined">calendar_today</span>
            </div>
          </div>

          <div className="bg-surface border border-outline-variant rounded-lg p-md shadow-sm flex items-center justify-between">
            <div>
              <p className="font-label-caps text-label-caps text-on-surface-variant">Status Database</p>
              <p className="font-h3 text-h3 text-emerald-600 mt-sm flex items-center gap-xs">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Mode Demo (Lokal)
              </p>
            </div>
            <div className="h-12 w-12 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined">cloud_off</span>
            </div>
          </div>
        </div>

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
          <div className="bg-surface border border-outline-variant rounded-lg p-xl text-center flex flex-col items-center gap-md">
            <span className="material-symbols-outlined text-[64px] text-on-surface-variant">history_edu</span>
            <div>
              <h3 className="font-h2 text-h2 text-on-surface">Belum Ada Catatan Jurnal</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-sm max-w-sm">
                {searchQuery
                  ? "Tidak ditemukan jurnal yang cocok dengan kata kunci pencarian Anda."
                  : "Mulai mengisi jurnal mengajar harian Anda dengan menekan tombol '+' di kanan bawah."}
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={openCreateModal}
                className="bg-primary text-on-primary font-label-caps text-label-caps px-4 py-2 rounded shadow-sm hover:bg-primary/90 transition-colors"
              >
                Buat Entri Pertama
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View (md:hidden) */}
            <div className="md:hidden flex flex-col gap-gutter">
              {filteredEntries.map((entry, idx) => (
                <div
                  key={entry._rowNum || idx}
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
                    <div className="font-caption text-caption text-secondary">
                      Kelas {entry["Kelas"]}
                    </div>
                    <div className="flex items-center gap-sm">
                      {renderKehadiranBadges(entry["Kehadiran"])}
                      <div className="flex gap-xs border-l border-outline-variant pl-sm ml-xs" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(entry)}
                          className="text-error hover:bg-error-container/20 p-1 rounded-full transition-colors flex items-center justify-center"
                          title="Hapus Jurnal"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Data Table View (hidden md:block) */}
            <div className="hidden md:block bg-surface border border-outline-variant rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant w-16 text-center">
                      No
                    </th>
                    <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant w-48">
                      Hari/Tanggal
                    </th>
                    <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant w-24">
                      Jam ke-
                    </th>
                    <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant w-28">
                      Kelas
                    </th>
                    <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant w-48">
                      Materi Pokok
                    </th>
                    <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant">
                      Kegiatan Pembelajaran
                    </th>
                    <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant w-32 text-center">
                      Kehadiran
                    </th>
                    <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant w-24 text-center">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-body-md text-on-surface">
                  {filteredEntries.map((entry, idx) => (
                    <tr
                      key={entry._rowNum || idx}
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
                      <td className="py-3 px-4 text-on-surface-variant truncate max-w-[200px]" title={entry["Kegiatan Pembelajaran"]}>
                        {entry["Kegiatan Pembelajaran"] || "-"}
                      </td>
                      <td className="py-3 px-4">
                        {renderKehadiranBadges(entry["Kehadiran"])}
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-xs">
                          <button
                            onClick={() => openEditModal(entry)}
                            className="text-primary hover:bg-surface-container-high p-1 rounded-full active:opacity-80 transition-all"
                            title="Edit Jurnal"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(entry)}
                            className="text-error hover:bg-error-container/20 p-1 rounded-full active:opacity-80 transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-surface w-full max-w-lg rounded-lg shadow-2xl border border-outline-variant overflow-hidden transform scale-100 transition-all flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-h2 text-h2 text-on-surface">
                {modalMode === "create" ? "Tambah Jurnal Mengajar" : "Edit Jurnal Mengajar"}
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
              {/* Date Helper Picker & Input */}
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-label-caps text-on-surface-variant">
                  Hari, tanggal <span className="text-error">*</span>
                </label>
                <div className="flex gap-gutter">
                  <input
                    type="date"
                    value={dateInput}
                    onChange={handleDateChange}
                    className="bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md"
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
                <input
                  type="text"
                  placeholder="Contoh: 1-2, atau 3-4"
                  value={formData["Jam ke-"]}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, "Jam ke-": e.target.value }))
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
                  value={formData["Kelas"]}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, "Kelas": e.target.value }))
                  }
                  className="w-full bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md"
                >
                  <option value="7A">Kelas 7A</option>
                  <option value="7B">Kelas 7B</option>
                  <option value="7C">Kelas 7C</option>
                  <option value="7D">Kelas 7D</option>
                  <option value="8A">Kelas 8A</option>
                  <option value="8C">Kelas 8C</option>
                  <option value="9A">Kelas 9A</option>
                </select>
              </div>

              {/* Materi Pokok */}
              <div className="flex flex-col gap-xs">
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
              <div className="flex flex-col gap-xs">
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

              {/* Kehadiran */}
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-label-caps text-on-surface-variant">
                  Kehadiran
                </label>
                <input
                  type="text"
                  placeholder="Contoh: H:30, A:2 (atau 30 Hadir, 2 Alpa)"
                  value={formData["Kehadiran"]}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, "Kehadiran": e.target.value }))
                  }
                  className="w-full bg-surface border border-outline rounded p-2 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md"
                />
                <p className="font-caption text-caption text-on-surface-variant mt-1">
                  Format disarankan: `H:30, A:2` (untuk memicu indikator kehadiran berwarna).
                </p>
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
                  {modalMode === "create" ? "Simpan Jurnal" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
