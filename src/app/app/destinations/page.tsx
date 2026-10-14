"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  ShoppingCart,
  Plus,
  Upload,
  Search,
  Filter,
  RefreshCw,
  Edit,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  MapPin,
} from "lucide-react";
import { Button, Badge, EmptyState } from "@/components/ui";
import { CsvImportDialog } from "@/components/operations/CsvImportDialog";
import { DestinationFormDialog } from "@/components/operations/DestinationFormDialog";
import { DemandFormDialog } from "@/components/operations/DemandFormDialog";
import styles from "@/components/operations/Operations.module.scss";

export default function DestinationsPage() {
  const [activeTab, setActiveTab] = useState<"destinations" | "demands">("destinations");

  // Destinations state
  const [destinations, setDestinations] = useState<any[]>([]);
  const [destTotal, setDestTotal] = useState(0);
  const [destPage, setDestPage] = useState(1);
  const [destSearch, setDestSearch] = useState("");
  const [destTier, setDestTier] = useState("");
  const [destLoading, setDestLoading] = useState(true);

  // Demands state
  const [demands, setDemands] = useState<any[]>([]);
  const [demandTotal, setDemandTotal] = useState(0);
  const [demandPage, setDemandPage] = useState(1);
  const [demandSearch, setDemandSearch] = useState("");
  const [demandDestId, setDemandDestId] = useState("");
  const [demandCmdId, setDemandCmdId] = useState("");
  const [demandStatus, setDemandStatus] = useState("");
  const [demandLoading, setDemandLoading] = useState(true);

  // Lookups
  const [commodities, setCommodities] = useState<any[]>([]);

  // Dialogs
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isDestFormOpen, setIsDestFormOpen] = useState(false);
  const [editingDest, setEditingDest] = useState<any | null>(null);

  const [isDemandFormOpen, setIsDemandFormOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<any | null>(null);

  useEffect(() => {
    fetch("/api/commodities")
      .then((r) => r.json())
      .then((d) => setCommodities(d.commodities || []))
      .catch(console.error);
  }, []);

  const fetchDestinations = useCallback(() => {
    setDestLoading(true);
    const params = new URLSearchParams();
    if (destSearch) params.set("search", destSearch);
    if (destTier) params.set("tier", destTier);
    params.set("page", String(destPage));
    params.set("pageSize", "10");

    fetch(`/api/destinations?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setDestinations(data.destinations || []);
        setDestTotal(data.total || 0);
      })
      .catch(console.error)
      .finally(() => setDestLoading(false));
  }, [destSearch, destTier, destPage]);

  const fetchDemands = useCallback(() => {
    setDemandLoading(true);
    const params = new URLSearchParams();
    if (demandSearch) params.set("search", demandSearch);
    if (demandDestId) params.set("destinationId", demandDestId);
    if (demandCmdId) params.set("commodityId", demandCmdId);
    if (demandStatus) params.set("status", demandStatus);
    params.set("page", String(demandPage));
    params.set("pageSize", "10");

    fetch(`/api/demands?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setDemands(data.demands || []);
        setDemandTotal(data.total || 0);
      })
      .catch(console.error)
      .finally(() => setDemandLoading(false));
  }, [demandSearch, demandDestId, demandCmdId, demandStatus, demandPage]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  useEffect(() => {
    fetchDemands();
  }, [fetchDemands]);

  const totalRequestedKg = demands.reduce((acc, d) => acc + (d.requestedQuantity || 0), 0);
  const totalFulfilledKg = demands.reduce((acc, d) => acc + (d.fulfilledQuantity || 0), 0);
  const totalUnfulfilledKg = demands.reduce((acc, d) => acc + (d.unfulfilledQuantity || 0), 0);

  return (
    <div className={styles.pageContainer}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.titleArea}>
          <div className={styles.pageTitle}>
            <Building2 size={28} color="var(--accent-lime, #d4f933)" />
            <span>Destinations & Demand Management</span>
          </div>
          <div className={styles.pageSubtitle}>
            Retail Receiving SLAs // Dock Acceptance Windows // Demand Order Fulfillment Tracking
          </div>
        </div>

        <div className={styles.actionButtons}>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Upload size={14} />}
            onClick={() => setIsCsvModalOpen(true)}
          >
            Import CSV
          </Button>
          {activeTab === "destinations" ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => {
                setEditingDest(null);
                setIsDestFormOpen(true);
              }}
            >
              New Destination
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => {
                setEditingDemand(null);
                setIsDemandFormOpen(true);
              }}
            >
              Create Demand Order
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border-default)", paddingBottom: "0.5rem" }}>
        <Button
          variant={activeTab === "destinations" ? "primary" : "ghost"}
          size="sm"
          leftIcon={<Building2 size={14} />}
          onClick={() => setActiveTab("destinations")}
        >
          Buyer Destinations ({destTotal})
        </Button>
        <Button
          variant={activeTab === "demands" ? "primary" : "ghost"}
          size="sm"
          leftIcon={<ShoppingCart size={14} />}
          onClick={() => setActiveTab("demands")}
        >
          Customer Demand Orders ({demandTotal})
        </Button>
      </div>

      {activeTab === "destinations" ? (
        <>
          {/* Metrics */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Contracted Receiving Buyers</span>
              <div className={styles.statValue}>{destTotal}</div>
              <span className={styles.statSub}>Configured distribution drop-points</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Strict Tier 1 Supermarkets</span>
              <div className={styles.statValue}>
                {destinations.filter((d) => d.tier === "PREMIUM_GROCER").length}
              </div>
              <span className={styles.statSub}>Requires &ge; 5.0 to 7.0 days arrival RSL</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Salvage / Discount Partners</span>
              <div className={styles.statValue} style={{ color: "var(--accent-lime, #d4f933)" }}>
                {destinations.filter((d) => d.acceptsDiscounts).length}
              </div>
              <span className={styles.statSub}>Enabled for dynamic markdown recovery</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className={styles.filterBar}>
            <div className={styles.searchGroup}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by destination code, name, city, or market tier..."
                value={destSearch}
                onChange={(e) => {
                  setDestSearch(e.target.value);
                  setDestPage(1);
                }}
              />
            </div>
            <div className={styles.filterControls}>
              <select
                className={styles.selectInput}
                value={destTier}
                onChange={(e) => {
                  setDestTier(e.target.value);
                  setDestPage(1);
                }}
              >
                <option value="">All Tiers</option>
                <option value="PREMIUM_GROCER">Tier 1 Premium Grocer</option>
                <option value="REGIONAL_SUPERMARKET">Regional Supermarket</option>
                <option value="FOOD_SERVICE_PROCESSOR">Food Service Processor</option>
                <option value="DISCOUNT_CHAIN">Discount Chain / Salvage</option>
              </select>
              <Button variant="ghost" size="sm" onClick={fetchDestinations}>
                <RefreshCw size={14} />
              </Button>
            </div>
          </div>

          {/* Destinations Table */}
          <div className={styles.tableCard}>
            {destLoading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                Loading receiving buyers...
              </div>
            ) : destinations.length === 0 ? (
              <div style={{ padding: "3rem" }}>
                <EmptyState
                  icon={<Building2 size={36} />}
                  title="No Destinations Found"
                  description="No buyer facilities matched your query."
                />
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Buyer Code</th>
                      <th>Facility & Location</th>
                      <th>Market Tier</th>
                      <th>Min Arrival Shelf-Life SLA</th>
                      <th>Discount Policy</th>
                      <th>Dock Receiving Hours</th>
                      <th>Active Orders</th>
                      <th>Total Demand</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {destinations.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <span className={styles.batchCodeCell}>{d.code}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{d.name}</span>
                          <span className={styles.subText}>{d.address}, {d.city}, {d.state}</span>
                        </td>
                        <td>
                          <Badge variant="neutral">{d.tier.replace(/_/g, " ")}</Badge>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: d.minShelfLifeDays >= 5 ? "var(--warning)" : "var(--produce-emerald)" }}>
                            {d.minShelfLifeDays} days
                          </span>
                          <span className={styles.subText}>Strict dock gate SLA</span>
                        </td>
                        <td>
                          {d.acceptsDiscounts ? (
                            <Badge variant="fresh">Max {d.maxDiscountPercent}% Off</Badge>
                          ) : (
                            <Badge variant="neutral">Fixed Price Only</Badge>
                          )}
                        </td>
                        <td>
                          <span style={{ fontFamily: "var(--font-mono, monospace)" }}>
                            {d.receivingHoursStart} – {d.receivingHoursEnd}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{d.activeDemandsCount} orders</td>
                        <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                          {d.totalRequestedKg.toLocaleString()} kg
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingDest(d);
                              setIsDestFormOpen(true);
                            }}
                          >
                            <Edit size={13} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Demand Orders Tab */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Total Demand Orders</span>
              <div className={styles.statValue}>{demandTotal}</div>
              <span className={styles.statSub}>Pending and allocated orders</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Total Requested Mass</span>
              <div className={styles.statValue}>
                {totalRequestedKg.toLocaleString()}
                <span style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontWeight: 500 }}>kg</span>
              </div>
              <span className={styles.statSub}>Network buyer commitments</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Fulfilled vs Unfulfilled</span>
              <div className={styles.statValue} style={{ fontSize: "1.25rem", color: "var(--produce-emerald, #10b981)" }}>
                {totalFulfilledKg.toLocaleString()} kg
                <span style={{ fontSize: "0.8125rem", color: "var(--danger, #ef4444)", marginLeft: "0.5rem" }}>
                  ({totalUnfulfilledKg.toLocaleString()} kg shortage)
                </span>
              </div>
              <span className={styles.statSub}>Supply gap tracking</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className={styles.filterBar}>
            <div className={styles.searchGroup}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by order #, buyer name, or commodity..."
                value={demandSearch}
                onChange={(e) => {
                  setDemandSearch(e.target.value);
                  setDemandPage(1);
                }}
              />
            </div>
            <div className={styles.filterControls}>
              <select
                className={styles.selectInput}
                value={demandDestId}
                onChange={(e) => {
                  setDemandDestId(e.target.value);
                  setDemandPage(1);
                }}
              >
                <option value="">All Destinations</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                className={styles.selectInput}
                value={demandCmdId}
                onChange={(e) => {
                  setDemandCmdId(e.target.value);
                  setDemandPage(1);
                }}
              >
                <option value="">All Commodities</option>
                {commodities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className={styles.selectInput}
                value={demandStatus}
                onChange={(e) => {
                  setDemandStatus(e.target.value);
                  setDemandPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="ALLOCATED">ALLOCATED</option>
                <option value="PARTIALLY_ALLOCATED">PARTIALLY ALLOCATED</option>
                <option value="DELIVERED">DELIVERED</option>
              </select>

              <Button variant="ghost" size="sm" onClick={fetchDemands}>
                <RefreshCw size={14} />
              </Button>
            </div>
          </div>

          {/* Demands Table */}
          <div className={styles.tableCard}>
            {demandLoading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                Loading demand orders...
              </div>
            ) : demands.length === 0 ? (
              <div style={{ padding: "3rem" }}>
                <EmptyState
                  icon={<ShoppingCart size={36} />}
                  title="No Demand Orders Found"
                  description="No customer demand orders matched your active filters."
                />
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Order PO #</th>
                      <th>Receiving Destination</th>
                      <th>Commodity</th>
                      <th>Requested Quantity</th>
                      <th>Fulfilled / Shortage</th>
                      <th>Agreed Price</th>
                      <th>Arrival Window Start & End</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demands.map((dm) => (
                      <tr key={dm.id}>
                        <td>
                          <span className={styles.batchCodeCell}>{dm.orderNumber}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {dm.destinationName}
                          </span>
                          <span className={styles.subText}>Min {dm.minShelfLifeDays}d SLA required</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {dm.commodityName}
                          </span>
                          <span className={styles.subText}>{dm.commodityCategory}</span>
                        </td>
                        <td>
                          <span className={styles.quantityCell}>
                            {dm.requestedQuantity.toLocaleString()} kg
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: "var(--produce-emerald)" }}>
                            {dm.fulfilledQuantity.toLocaleString()} kg
                          </span>
                          {dm.unfulfilledQuantity > 0 && (
                            <span className={styles.subText} style={{ color: "var(--danger)" }}>
                              {dm.unfulfilledQuantity.toLocaleString()} kg shortage
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={styles.priceCell}>${dm.contractedPricePerUnit.toFixed(2)}</span>
                          <span className={styles.subText}>/ kg</span>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.8125rem", color: "var(--text-primary)" }}>
                            {new Date(dm.deliveryWindowStart).toLocaleDateString()}
                          </span>
                          <span className={styles.subText}>
                            {new Date(dm.deliveryWindowStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(dm.deliveryWindowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td>
                          <Badge
                            variant={
                              dm.status === "DELIVERED"
                                ? "fresh"
                                : dm.status === "ALLOCATED"
                                ? "lime"
                                : dm.status === "PARTIALLY_ALLOCATED"
                                ? "warning"
                                : "neutral"
                            }
                          >
                            {dm.status}
                          </Badge>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingDemand(dm);
                              setIsDemandFormOpen(true);
                            }}
                          >
                            <Edit size={13} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* CSV Import Dialog */}
      <CsvImportDialog
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        templateType="destinations-demand"
        title="Destinations & Demand Batch CSV Import"
        onImportSuccess={() => {
          fetchDestinations();
          fetchDemands();
        }}
      />

      {/* Destination Form Dialog */}
      <DestinationFormDialog
        isOpen={isDestFormOpen}
        onClose={() => {
          setIsDestFormOpen(false);
          setEditingDest(null);
        }}
        destinationToEdit={editingDest}
        onSuccess={() => {
          fetchDestinations();
        }}
      />

      {/* Demand Form Dialog */}
      <DemandFormDialog
        isOpen={isDemandFormOpen}
        onClose={() => {
          setIsDemandFormOpen(false);
          setEditingDemand(null);
        }}
        demandToEdit={editingDemand}
        onSuccess={() => {
          fetchDemands();
        }}
      />
    </div>
  );
}
