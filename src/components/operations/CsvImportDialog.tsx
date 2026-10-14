"use client";

import React, { useState, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Upload, FileText, CheckCircle2, AlertCircle, AlertTriangle, Download, X, Loader2 } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import styles from "./Operations.module.scss";

export type CsvTemplateType = "inventory" | "destinations-demand" | "transport";

interface CsvImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  templateType: CsvTemplateType;
  title: string;
  onImportSuccess: () => void;
}

interface CsvRowError {
  rowNumber: number;
  field?: string;
  message: string;
}

export function CsvImportDialog({
  isOpen,
  onClose,
  templateType,
  title,
  onImportSuccess,
}: CsvImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [validatedRows, setValidatedRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<CsvRowError[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [successReport, setSuccessReport] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setCsvContent("");
    setPreviewRows([]);
    setValidatedRows([]);
    setErrors([]);
    setTotalRows(0);
    setSuccessReport(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDownloadTemplate = () => {
    window.open(`/api/import/template?type=${templateType}`, "_blank");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setPreviewRows([]);
    setSuccessReport(null);

    const text = await selectedFile.text();
    setCsvContent(text);
    await validateContent(text);
  };

  const validateContent = async (text: string) => {
    setIsValidating(true);
    setErrors([]);
    try {
      const res = await fetch("/api/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: templateType, csvContent: text }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrors([{ rowNumber: 0, message: data.error || "Failed to validate CSV" }]);
        setTotalRows(0);
      } else {
        setTotalRows(data.totalRows);
        setErrors(data.errors || []);
        setPreviewRows(data.previewRows || []);
        setValidatedRows(data.previewRows || []); // Valid rows available for commit
      }
    } catch (err: any) {
      setErrors([{ rowNumber: 0, message: err.message || "Network error validating file" }]);
    } finally {
      setIsValidating(false);
    }
  };

  const handleCommit = async () => {
    if (errors.length > 0 || previewRows.length === 0) return;

    setIsCommitting(true);
    try {
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: templateType, rows: validatedRows }),
      });

      const data = await res.json();
      if (!res.ok && res.status !== 207) {
        setErrors([{ rowNumber: 0, message: data.error || "Failed to commit records" }]);
      } else {
        setSuccessReport(
          `Successfully committed ${data.succeededCount} records into the FreshRoute persistent database!`
        );
        onImportSuccess();
      }
    } catch (err: any) {
      setErrors([{ rowNumber: 0, message: err.message || "Failed to commit records" }]);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.modalOverlay} />
        <DialogPrimitive.Content className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <div>
              <DialogPrimitive.Title className={styles.modalTitle}>
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className={styles.modalSubtitle}>
                Batch CSV upload with schema validation, duplicate detection, and transactional commit.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <button className={styles.closeBtn} aria-label="Close modal">
                <X size={18} />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className={styles.importActionsBar}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={handleDownloadTemplate}
            >
              Download Sample CSV Template
            </Button>
            <span className={styles.formatNotice}>
              UTF-8 CSV format required // Strict headers validated
            </span>
          </div>

          {!successReport ? (
            <>
              <div
                className={styles.dropZone}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <Upload size={32} className={styles.dropZoneIcon} />
                <div className={styles.dropZoneText}>
                  {file ? (
                    <strong>{file.name} ({(file.size / 1024).toFixed(1)} KB)</strong>
                  ) : (
                    <span>Click to select CSV file or drag and drop</span>
                  )}
                </div>
                <span className={styles.dropZoneSub}>Max file size: 5MB // Automatic row parsing</span>
              </div>

              {isValidating && (
                <div className={styles.statusBox}>
                  <Loader2 size={18} className={styles.spinner} />
                  <span>Validating schema, column mappings, and reference keys...</span>
                </div>
              )}

              {errors.length > 0 && (
                <div className={styles.errorSection}>
                  <div className={styles.errorSectionHeader}>
                    <AlertCircle size={16} color="var(--danger, #ef4444)" />
                    <strong>Row-Level Validation Errors ({errors.length})</strong>
                  </div>
                  <div className={styles.errorList}>
                    {errors.map((err, i) => (
                      <div key={i} className={styles.errorItem}>
                        <span className={styles.rowBadge}>Line {err.rowNumber}</span>
                        {err.field && <code className={styles.fieldTag}>{err.field}</code>}
                        <span className={styles.errorMsg}>{err.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewRows.length > 0 && errors.length === 0 && (
                <div className={styles.previewSection}>
                  <div className={styles.previewHeader}>
                    <div className={styles.previewTitle}>
                      <CheckCircle2 size={16} color="var(--success, #10b981)" />
                      <strong>Preview: Validated Rows ({totalRows} detected)</strong>
                    </div>
                    <Badge variant="fresh">All Constraints Satisfied</Badge>
                  </div>
                  <div className={styles.previewTableWrapper}>
                    <table className={styles.previewTable}>
                      <thead>
                        <tr>
                          {Object.keys(previewRows[0] || {}).slice(0, 6).map((k) => (
                            <th key={k}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.slice(0, 5).map((row, idx) => (
                          <tr key={idx}>
                            {Object.values(row).slice(0, 6).map((val: any, cIdx) => (
                              <td key={cIdx}>
                                {typeof val === "object" ? JSON.stringify(val) : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className={styles.modalFooter}>
                <Button variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={errors.length > 0 || previewRows.length === 0 || isCommitting || isValidating}
                  loading={isCommitting}
                  leftIcon={<FileText size={16} />}
                  onClick={handleCommit}
                >
                  {isCommitting ? "Committing..." : `Confirm & Commit (${totalRows} Records)`}
                </Button>
              </div>
            </>
          ) : (
            <div className={styles.successReportBox}>
              <CheckCircle2 size={40} color="var(--success, #10b981)" />
              <div className={styles.successTitle}>Import Completed</div>
              <p className={styles.successDesc}>{successReport}</p>
              <Button variant="primary" onClick={handleClose}>
                Done
              </Button>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
