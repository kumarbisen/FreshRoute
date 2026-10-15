"use client";

import React, { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import styles from "./Operations.module.scss";

interface DemandFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  demandToEdit?: any | null;
}

export function DemandFormDialog({
  isOpen,
  onClose,
  onSuccess,
  demandToEdit,
}: DemandFormDialogProps) {
  const isEditing = Boolean(demandToEdit);

  const [destinations, setDestinations] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);

  const [destinationId, setDestinationId] = useState("");
  const [commodityId, setCommodityId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [requestedQuantity, setRequestedQuantity] = useState("4000");
  const [contractedPrice, setContractedPrice] = useState("5.50");
  const [deliveryWindowStart, setDeliveryWindowStart] = useState(
    new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16)
  );
  const [deliveryWindowEnd, setDeliveryWindowEnd] = useState(
    new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 16)
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/destinations")
      .then((r) => r.json())
      .then((d) => {
        setDestinations(d.destinations || []);
        if (!isEditing && d.destinations?.length > 0) {
          setDestinationId(d.destinations[0].id);
        }
      })
      .catch(console.error);

    fetch("/api/commodities")
      .then((r) => r.json())
      .then((d) => {
        setCommodities(d.commodities || []);
        if (!isEditing && d.commodities?.length > 0) {
          setCommodityId(d.commodities[0].id);
        }
      })
      .catch(console.error);

    if (demandToEdit) {
      setDestinationId(demandToEdit.destinationId);
      setCommodityId(demandToEdit.commodityId);
      setOrderNumber(demandToEdit.orderNumber);
      setRequestedQuantity(String(demandToEdit.requestedQuantity));
      setContractedPrice(String(demandToEdit.contractedPricePerUnit));
      setDeliveryWindowStart(new Date(demandToEdit.deliveryWindowStart).toISOString().slice(0, 16));
      setDeliveryWindowEnd(new Date(demandToEdit.deliveryWindowEnd).toISOString().slice(0, 16));
    } else {
      setOrderNumber(`ORD-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`);
      setRequestedQuantity("4000");
      setContractedPrice("5.50");
      setDeliveryWindowStart(new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16));
      setDeliveryWindowEnd(new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 16));
    }
    setError(null);
  }, [isOpen, demandToEdit, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing) {
        const res = await fetch(`/api/demands/${demandToEdit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestedQuantityKg: requestedQuantity,
            contractedPricePerKg: contractedPrice,
            deliveryWindowStart: new Date(deliveryWindowStart),
            deliveryWindowEnd: new Date(deliveryWindowEnd),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update demand order");
      } else {
        const res = await fetch("/api/demands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationId,
            commodityId,
            orderNumber,
            requestedQuantity: requestedQuantity,
            contractedPricePerUnit: contractedPrice,
            deliveryWindowStart: new Date(deliveryWindowStart),
            deliveryWindowEnd: new Date(deliveryWindowEnd),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create demand order");
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
                {isEditing ? `Edit Demand Order: ${demandToEdit.orderNumber}` : "Create Customer Demand Order"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className={styles.modalSubtitle}>
                Specify receiving buyer, commodity demand, agreed pricing, and strict dock arrival delivery window.
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
                <label className={styles.fieldLabel}>Order Number / PO Code</label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Receiving Buyer / Destination</label>
                <select
                  disabled={isEditing}
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  className={styles.fieldInput}
                >
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code}) - {d.city} (Min {d.minShelfLifeDays}d SLA)
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Requested Commodity</label>
                <select
                  disabled={isEditing}
                  value={commodityId}
                  onChange={(e) => setCommodityId(e.target.value)}
                  className={styles.fieldInput}
                >
                  {commodities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}) - {c.category}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Requested Quantity (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={requestedQuantity}
                  onChange={(e) => setRequestedQuantity(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Contracted Selling Price (₹/kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={contractedPrice}
                  onChange={(e) => setContractedPrice(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Delivery Window Start (Dock Arrival)</label>
                <input
                  type="datetime-local"
                  required
                  value={deliveryWindowStart}
                  onChange={(e) => setDeliveryWindowStart(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Delivery Window End (Cutoff)</label>
                <input
                  type="datetime-local"
                  required
                  value={deliveryWindowEnd}
                  onChange={(e) => setDeliveryWindowEnd(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>
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
                {isSubmitting ? "Saving..." : isEditing ? "Save Order" : "Submit Demand Order"}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
