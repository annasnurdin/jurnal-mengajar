"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [entries, setEntries] = useState([]);
  const [parsedEntries, setParsedEntries] = useState([]);
  const [metadata, setMetadata] = useState({
    mataPelajaran: "Pendidikan Pancasila",
    kelas: "7D",
    semester: "II",
    tahunAjaran: "2025/2026",
  });
  const [headerMapping, setHeaderMapping] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
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
    // Using format matching home.html: "Senin, 12 Okt 2023"
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
              className={`${badgeClass} text-[10px] px-1.5 py-0.5 rounded-full`}
              title={badge.title}
            >
              {badge.label}
            </span>
          );
        })}
      </div>
    );
  };

  // Parse spreadsheet rows for metadata and dynamic data entries
  const processRawEntries = (rawEntries) => {
    let tempMetadata = {
      mataPelajaran: "Pendidikan Pancasila",
      kelas: "7D",
      semester: "II",
      tahunAjaran: "2025/2026"
    };
    let journalEntries = [];
    let foundHeaderMapping = null;
    let headerRowIndex = -1;

    // 1. Find if there's a row containing "Hari, tanggal"
    for (let i = 0; i < rawEntries.length; i++) {
      const row = rawEntries[i];
      const isHeaderRow = Object.values(row).some(
        (val) => typeof val === "string" && val.trim().toLowerCase() === "hari, tanggal"
      );
      if (isHeaderRow) {
        headerRowIndex = i;
        foundHeaderMapping = row;
        break;
      }
    }

    if (headerRowIndex !== -1) {
      setHeaderMapping(foundHeaderMapping);
      
      // 2. Parse metadata from rows before the header row
      for (let i = 0; i < headerRowIndex; i++) {
        const row = rawEntries[i];
        const keys = Object.keys(row);
        let label = "";
        let value = "";
        for (let key of keys) {
          if (key === "_rowNum") continue;
          const val = String(row[key] || "").trim();
          const cleanVal = val.toLowerCase();
          if (cleanVal === "kelas") {
            label = "kelas";
          } else if (cleanVal === "mata pelajaran") {
            label = "mataPelajaran";
          } else if (cleanVal === "semester") {
            label = "semester";
          } else if (cleanVal === "tahun ajaran") {
            label = "tahunAjaran";
          } else if (val !== ":" && val !== "") {
            value = val;
          }
        }
        if (label && value) {
          tempMetadata[label] = value;
        }
      }
      setMetadata(tempMetadata);

      // 3. Parse journal entries from rows after the header row
      const internalToHeaderKey = {};
      Object.keys(foundHeaderMapping).forEach((internalKey) => {
        if (internalKey === "_rowNum") return;
        const headerName = String(foundHeaderMapping[internalKey] || "").trim();
        if (headerName) {
          internalToHeaderKey[internalKey] = headerName;
        }
      });

      for (let i = headerRowIndex + 1; i < rawEntries.length; i++) {
        const row = rawEntries[i];
        const mappedEntry = { _rowNum: row._rowNum };
        
        Object.keys(row).forEach((internalKey) => {
          if (internalKey === "_rowNum") return;
          const headerName = internalToHeaderKey[internalKey];
          if (headerName) {
            mappedEntry[headerName] = row[internalKey];
          } else {
            mappedEntry[internalKey] = row[internalKey];
          }
        });
        
        if (mappedEntry["Hari, tanggal"] || mappedEntry["Materi Pokok"]) {
          journalEntries.push(mappedEntry);
        }
      }
      setParsedEntries(journalEntries);
    } else {
      setHeaderMapping(null);
      // Filter out invalid/empty rows
      const filtered = rawEntries.filter(entry => {
        return (
          entry["Hari, tanggal"] ||
          entry["Materi Pokok"]
        ) && (
          entry["Hari, tanggal"] !== "Hari, tanggal"
        );
      });
      setParsedEntries(filtered);
    }
  };

  // Fetch all Jurnal entries
  const fetchEntries = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/jurnal");
      const result = await res.json();
      
      if (res.status === 500) {
        setError(result.error || "Gagal memuat data");
        return;
      }

      if (result.error) {
        setError(result.error);
      } else {
        const raw = result.data || [];
        setEntries(raw);
        processRawEntries(raw);
      }
    } catch (err) {
      setError("Tidak dapat terhubung ke server. Pastikan .env terkonfigurasi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
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
      "Materi Pokok": entry["Materi Pokok"] || "",
      "Kegiatan Pembelajaran": entry["Kegiatan Pembelajaran"] || "",
      "Kehadiran": entry["Kehadiran"] || "",
    });
    setDateInput("");
    setIsModalOpen(true);
  };

  // Map user-friendly formData back to sheet columns
  const getPayload = (data) => {
    if (!headerMapping) {
      return data;
    }
    const payload = {};
    Object.keys(headerMapping).forEach((internalKey) => {
      if (internalKey === "_rowNum") return;
      const headerName = String(headerMapping[internalKey] || "").trim();
      if (headerName === "Hari, tanggal") {
        payload[internalKey] = data["Hari, tanggal"];
      } else if (headerName === "Jam ke-") {
        payload[internalKey] = data["Jam ke-"];
      } else if (headerName === "Materi Pokok") {
        payload[internalKey] = data["Materi Pokok"];
      } else if (headerName === "Kegiatan Pembelajaran") {
        payload[internalKey] = data["Kegiatan Pembelajaran"];
      } else if (headerName === "Kehadiran") {
        payload[internalKey] = data["Kehadiran"];
      }
    });
    return payload;
  };

  // Submit form (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData["Hari, tanggal"] || !formData["Materi Pokok"]) {
      showToast("Kolom Hari/Tanggal dan Materi Pokok wajib diisi!", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadData = getPayload(formData);
      if (modalMode === "create") {
        const res = await fetch("/api/jurnal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadData),
        });
        const result = await res.json();
        if (result.error) throw new Error(result.error);
        showToast("Jurnal berhasil ditambahkan!");
      } else {
        // Edit mode
        const res = await fetch("/api/jurnal", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedEntry._rowNum,
            data: payloadData,
          }),
        });
        const result = await res.json();
        if (result.error) throw new Error(result.error);
        showToast("Jurnal berhasil diperbarui!");
      }
      setIsModalOpen(false);
      fetchEntries();
    } catch (err) {
      showToast(err.message || "Terjadi kesalahan sistem", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete an entry
  const handleDelete = async (entry) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus jurnal pada ${entry["Hari, tanggal"]}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/jurnal?id=${entry._rowNum}`, {
        method: "DELETE",
      });
      const result = await res.json();

      if (result.error) throw new Error(result.error);

      showToast("Jurnal berhasil dihapus!", "success");
      fetchEntries();
    } catch (err) {
      showToast(err.message || "Gagal menghapus jurnal", "error");
    }
  };

  // Filter entries based on search
  const filteredEntries = parsedEntries.filter((entry) => {
    const query = searchQuery.toLowerCase();
    return (
      (entry["Hari, tanggal"] || "").toLowerCase().includes(query) ||
      (entry["Materi Pokok"] || "").toLowerCase().includes(query) ||
      (entry["Kegiatan Pembelajaran"] || "").toLowerCase().includes(query) ||
      (entry["Kehadiran"] || "").toLowerCase().includes(query)
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

      {/* TopAppBar */}
      <header className="bg-surface border-b border-outline-variant fixed top-0 w-full z-50 flex items-center justify-between px-container-margin h-16">
        <button
          onClick={() => showToast("Menu navigasi sidebar akan segera hadir!", "info")}
          className="text-on-surface-variant hover:bg-surface-container-high transition-colors p-2 rounded-full active:opacity-80 flex items-center justify-center"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        
        <div className="font-h1-mobile text-h1-mobile font-semibold text-primary flex items-center gap-sm">
          <span>Jurnal Mengajar</span>
          <span className="hidden sm:inline-block text-xs bg-primary-container text-on-primary-container px-3 py-0.5 rounded-full font-normal">
            {metadata.kelas} - {metadata.mataPelajaran}
          </span>
        </div>

        <button
          onClick={fetchEntries}
          className="hover:bg-surface-container-high transition-colors p-1 rounded-full active:opacity-80 overflow-hidden w-10 h-10 flex items-center justify-center"
          title="Refresh Data"
        >
          {isLoading ? (
            <span className="material-symbols-outlined text-[24px] animate-spin text-primary">sync</span>
          ) : (
            <img
              alt="Profile picture of educator"
              className="w-full h-full object-cover rounded-full"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvojQwEtGFaVdGzsoleYLUMtjK6m88IoL7ytbZq_yTAq6kJa_hs08rjN3cTJM5b-edFscwNn6DQLKqcfUJsGv66f0fghI75Zdw58jtjyCpMvKE6-kSOWhQRjC_MKThVHVYzBRbpgcg5GXScP8271mdyauSXWEHaiPkFBp6Jaz0bKjZdS2qZoRmzpifJknU23Qgk0RRLEdUGICMQ6yyLaPLDtmKvnhBhGwp6bfnaxZU_q5D2UaHjZqy2_VAcVJrC_iaTzVLYDaoZw"
            />
          )}
        </button>
      </header>

      {/* Main Canvas */}
      <main className="flex-grow pt-[80px] pb-[100px] md:pb-lg px-container-margin max-w-7xl mx-auto w-full">
        {/* Error / Alert Config Bar */}
        {error && (
          <div className="bg-error-container text-on-error-container border border-error/20 rounded-lg p-md mb-lg flex gap-md">
            <span className="material-symbols-outlined text-error">warning</span>
            <div className="text-body-md">
              <p className="font-semibold">Terjadi Kendala Koneksi Sheet</p>
              <p className="mt-xs opacity-90">{error}</p>
              <p className="mt-sm text-xs font-semibold underline decoration-dotted">
                <a href="/dokumen.md" target="_blank">
                  Silakan baca dokumen.md untuk memverifikasi konfigurasi URL Web App
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Class & Subject Banner for Mobile View */}
        <div className="sm:hidden bg-surface-container-low border border-outline-variant rounded-lg p-md mb-lg">
          <div className="flex flex-col gap-xs">
            <span className="font-label-caps text-label-caps text-on-surface-variant">Mata Pelajaran / Kelas</span>
            <span className="font-h3 text-h3 text-primary">{metadata.mataPelajaran} ({metadata.kelas})</span>
            <div className="flex gap-sm text-on-surface-variant font-caption text-caption mt-xs">
              <span>Sem: {metadata.semester}</span>
              <span>•</span>
              <span>TA: {metadata.tahunAjaran}</span>
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
              onClick={() => showToast(`Filter Kelas: ${metadata.kelas}`, "info")}
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
            <p className="font-body-lg text-body-lg">Memuat data dari Google Sheets...</p>
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
                      Kelas {entry["Kelas"] || metadata.kelas}
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
                      <td className="py-3 px-4">{entry["Kelas"] || metadata.kelas}</td>
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

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden bg-surface border-t border-outline-variant fixed bottom-0 w-full z-50 flex justify-around items-center h-20 px-2 pb-safe">
        {/* Active Tab: Jurnal */}
        <button
          onClick={() => showToast("Anda sudah berada di halaman Jurnal", "info")}
          className="flex flex-col items-center justify-center gap-1 min-w-[64px] active:scale-95 transition-transform"
        >
          <div className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full px-4 py-1">
            <span className="material-symbols-outlined icon-fill">history_edu</span>
          </div>
          <span className="font-label-caps text-label-caps text-on-surface font-semibold">Jurnal</span>
        </button>

        {/* Inactive Tab: Siswa */}
        <button
          onClick={() => showToast("Halaman Daftar Siswa akan segera hadir!", "info")}
          className="flex flex-col items-center justify-center gap-1 min-w-[64px] text-on-surface-variant hover:bg-surface-container-highest rounded-lg p-1 transition-colors active:scale-95"
        >
          <div className="flex flex-col items-center justify-center px-4 py-1">
            <span className="material-symbols-outlined">group</span>
          </div>
          <span className="font-label-caps text-label-caps">Siswa</span>
        </button>

        {/* Inactive Tab: Kelas */}
        <button
          onClick={() => showToast("Halaman Manajemen Kelas akan segera hadir!", "info")}
          className="flex flex-col items-center justify-center gap-1 min-w-[64px] text-on-surface-variant hover:bg-surface-container-highest rounded-lg p-1 transition-colors active:scale-95"
        >
          <div className="flex flex-col items-center justify-center px-4 py-1">
            <span className="material-symbols-outlined">school</span>
          </div>
          <span className="font-label-caps text-label-caps">Kelas</span>
        </button>

        {/* Inactive Tab: Materi */}
        <button
          onClick={() => showToast("Halaman Modul & Materi akan segera hadir!", "info")}
          className="flex flex-col items-center justify-center gap-1 min-w-[64px] text-on-surface-variant hover:bg-surface-container-highest rounded-lg p-1 transition-colors active:scale-95"
        >
          <div className="flex flex-col items-center justify-center px-4 py-1">
            <span className="material-symbols-outlined">menu_book</span>
          </div>
          <span className="font-label-caps text-label-caps">Materi</span>
        </button>
      </nav>

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
