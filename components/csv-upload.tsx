"use client";

import { useState, useCallback } from "react";
import { parseCSV } from "@/lib/csv-parser";
import { Lead } from "@/lib/types";

interface CSVUploadProps {
  onLeadsParsed: (leads: Lead[], totalRows: number) => void;
}

export function CSVUpload({ onLeadsParsed }: CSVUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const { leads, totalRows } = parseCSV(text);

        if (leads.length === 0) {
          setError("No valid leads found. Make sure your CSV has columns like First Name, Last Name, Email, Title, Company.");
          return;
        }

        onLeadsParsed(leads, totalRows);
      };
      reader.readAsText(file);
    },
    [onLeadsParsed]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
        handleFile(file);
      } else {
        setError("Please upload a CSV file");
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          dragOver ? "border-blue-500 bg-blue-50" : "border-zinc-300 hover:border-zinc-400"
        }`}
        onClick={() => document.getElementById("csv-input")?.click()}
      >
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          onChange={handleInputChange}
          className="hidden"
        />
        <div className="text-4xl mb-3">📋</div>
        <p className="text-lg font-medium text-zinc-700">
          {fileName ? fileName : "Drop your CSV here"}
        </p>
        <p className="text-sm text-zinc-500 mt-1">
          Export from Apollo or Sales Navigator, then drop it here
        </p>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
      )}
    </div>
  );
}
