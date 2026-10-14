"use client";

import React, { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import styles from "./Operations.module.scss";

interface DestinationFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  destinationToEdit?: any | null;
}

export function DestinationFormDialog({
  isOpen,
  onClose,
  onSuccess,
  destinationToEdit,
}: DestinationFormDialogProps) {
  const isEditing = Boolean(destinationToEdit);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [tier, setTier] = useState("PREMIUM_GROCER");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("CA");
  const [postalCode, setPostalCode] = useState("");
  const [latitude, setLatitude] = useState("37.774900");
  const [longitude, setLongitude] = useState("-122.419400");
  const [minShelfLifeDays, setMinShelfLifeDays] = useState(5);
  const [acceptsDiscounts, setAcceptsDiscounts] = useState(false);
  const [maxDiscountPercent, setMaxDiscountPercent] = useState("0.00");
  const [receivingHoursStart, setReceivingHoursStart] = useState("04:00");
  const [receivingHoursEnd, setReceivingHoursEnd] = useState("14:00");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (destinationToEdit) {
      setCode(destinationToEdit.code);
      setName(destinationToEdit.name);
      setTier(destinationToEdit.tier);
      setAddress(destinationToEdit.address);
      setCity(destinationToEdit.city);
      setState(destinationToEdit.state);
      setPostalCode(destinationToEdit.postalCode);
      setLatitude(String(destinationToEdit.latitude));
      setLongitude(String(destinationToEdit.longitude));
      setMinShelfLifeDays(destinationToEdit.minShelfLifeDays);
      setAcceptsDiscounts(destinationToEdit.acceptsDiscounts);
      setMaxDiscountPercent(String(destinationToEdit.maxDiscountPercent));
      setReceivingHoursStart(destinationToEdit.receivingHoursStart);
      setReceivingHoursEnd(destinationToEdit.receivingHoursEnd);
    } else {
      setCode(`DEST-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
      setName("");
      setTier("PREMIUM_GROCER");
      setAddress("100 Market St");
      setCity("San Francisco");
      setState("CA");
      setPostalCode("94102");
      setLatitude("37.774900");
      setLongitude("-122.419400");
      setMinShelfLifeDays(5);
      setAcceptsDiscounts(false);
      setMaxDiscountPercent("0.00");
      setReceivingHoursStart("04:00");
      setReceivingHoursEnd("14:00");
    }
    setError(null);
  }, [isOpen, destinationToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing) {
        const res = await fetch(`/api/destinations/${destinationToEdit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            tier,
            address,
            city,
            state,
            postalCode,
            latitude,
            longitude,
            minShelfLifeDays,
            acceptsDiscounts,
            maxDiscountPercent,
            receivingHoursStart,
            receivingHoursEnd,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update destination");
      } else {
        const res = await fetch("/api/destinations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            name,
            tier,
            address,
            city,
            state,
            postalCode,
            latitude,
            longitude,
            minShelfLifeDays,
            acceptsDiscounts,
            maxDiscountPercent,
            receivingHoursStart,
            receivingHoursEnd,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create destination");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.modalOverlay} />
        <DialogPrimitive.Content className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <div>
              <DialogPrimitive.Title className={styles.modalTitle}>
                {isEditing ? `Edit Receiving Buyer: ${destinationToEdit.name}` : "Register New Buyer Destination"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className={styles.modalSubtitle}>
                Configure delivery SLA thresholds, geo-coordinates, receiving dock windows, and discount rules.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <button className={styles.closeBtn} aria-label="Close">
                <X size={18} />
              </button>
            </DialogPrimitive.Close>
          </div>

          {error && (
            <div style={{ padding: "0.75rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "6px", color: "var(--danger, #ef4444)", fontSize: "0.8125rem", marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Destination Code</label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Customer / Facility Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={styles.fieldInput}
                  placeholder="e.g. Metro Fresh Supermarket SF"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Market Tier</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className={styles.fieldInput}
                >
                  <option value="PREMIUM_GROCER">Tier 1 Premium Grocer</option>
                  <option value="REGIONAL_SUPERMARKET">Regional Supermarket Chain</option>
                  <option value="FOOD_SERVICE_PROCESSOR">Food Service Processor</option>
                  <option value="DISCOUNT_CHAIN">Secondary Discount / Salvage</option>
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Minimum Shelf Life SLA (Days on Arrival)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={minShelfLifeDays}
                  onChange={(e) => setMinShelfLifeDays(parseInt(e.target.value, 10))}
                  className={styles.fieldInput}
                />
              </div>

              <div className={`${styles.fieldGroup} ${styles.formFieldFull}`}>
                <label className={styles.fieldLabel}>Receiving Facility Address</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>City & State</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={styles.fieldInput}
                    style={{ flex: 2 }}
                    placeholder="City"
                  />
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={styles.fieldInput}
                    style={{ flex: 1 }}
                    placeholder="State"
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Postal Code</label>
                <input
                  type="text"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Dock Receiving Hours (Start - End)</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="time"
                    required
                    value={receivingHoursStart}
                    onChange={(e) => setReceivingHoursStart(e.target.value)}
                    className={styles.fieldInput}
                  />
                  <input
                    type="time"
                    required
                    value={receivingHoursEnd}
                    onChange={(e) => setReceivingHoursEnd(e.target.value)}
                    className={styles.fieldInput}
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Accepts Markdown Discounts?</label>
                <select
                  value={acceptsDiscounts ? "true" : "false"}
                  onChange={(e) => setAcceptsDiscounts(e.target.value === "true")}
                  className={styles.fieldInput}
                >
                  <option value="false">No (Strict Fixed Contract)</option>
                  <option value="true">Yes (Dynamic Salvage Markdown Allowed)</option>
                </select>
              </div>

              {acceptsDiscounts && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Max Allowed Discount (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="60"
                    value={maxDiscountPercent}
                    onChange={(e) => setMaxDiscountPercent(e.target.value)}
                    className={styles.fieldInput}
                  />
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <Button variant="ghost" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isSubmitting}
                loading={isSubmitting}
                leftIcon={<Save size={16} />}
              >
                {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Destination"}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
