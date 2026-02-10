import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// ---------- Types ----------

export interface ReportData {
  buildingName: string;
  buildingAddress: string;
  orgName: string;
  dateRange: { from: string; to: string };
  generatedAt: string;
  kpis: {
    passRate: number | null;
    totalInspections: number;
    openDeficiencies: number;
    completionRate: number | null;
  };
  inspections: ReportInspection[];
  deficiencies: ReportDeficiency[];
}

export interface ReportInspection {
  spaceName: string;
  inspectorName: string;
  completedAt: string;
  passCount: number;
  failCount: number;
  responses: ReportResponse[];
}

export interface ReportResponse {
  itemDescription: string;
  result: "pass" | "fail";
  comment: string | null;
  photoUrls: string[];
}

export interface ReportDeficiency {
  number: string;
  spaceName: string;
  status: string;
  createdAt: string;
  resolutionComment: string | null;
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#334155",
  },
  header: {
    marginBottom: 24,
    borderBottom: "2px solid #0E8585",
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  meta: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 8,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  kpiBox: {
    flex: 1,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    border: "1px solid #E2E8F0",
  },
  kpiLabel: {
    fontSize: 8,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 8,
    marginTop: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#64748B",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottom: "1px solid #F1F5F9",
  },
  cellSm: { width: "15%" },
  cellMd: { width: "25%" },
  cellLg: { width: "35%" },
  badge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  passBadge: {
    backgroundColor: "#F0FDF4",
    color: "#16A34A",
  },
  failBadge: {
    backgroundColor: "#FEF2F2",
    color: "#DC2626",
  },
  photo: {
    width: 80,
    height: 60,
    objectFit: "cover",
    borderRadius: 4,
    marginRight: 4,
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#94A3B8",
  },
});

// ---------- Document Component ----------

export function InspectionReport({ data }: { data: ReportData }) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, "Inspection Report"),
        React.createElement(
          Text,
          { style: styles.subtitle },
          `${data.buildingName} — ${data.buildingAddress}`
        ),
        React.createElement(
          Text,
          { style: styles.meta },
          `${data.orgName} | ${data.dateRange.from} to ${data.dateRange.to} | Generated ${data.generatedAt}`
        )
      ),
      // KPIs
      React.createElement(
        View,
        { style: styles.kpiRow },
        React.createElement(
          View,
          { style: styles.kpiBox },
          React.createElement(Text, { style: styles.kpiLabel }, "Pass Rate"),
          React.createElement(
            Text,
            { style: styles.kpiValue },
            data.kpis.passRate !== null ? `${data.kpis.passRate}%` : "--"
          )
        ),
        React.createElement(
          View,
          { style: styles.kpiBox },
          React.createElement(
            Text,
            { style: styles.kpiLabel },
            "Inspections"
          ),
          React.createElement(
            Text,
            { style: styles.kpiValue },
            String(data.kpis.totalInspections)
          )
        ),
        React.createElement(
          View,
          { style: styles.kpiBox },
          React.createElement(
            Text,
            { style: styles.kpiLabel },
            "Open Deficiencies"
          ),
          React.createElement(
            Text,
            { style: styles.kpiValue },
            String(data.kpis.openDeficiencies)
          )
        ),
        React.createElement(
          View,
          { style: styles.kpiBox },
          React.createElement(
            Text,
            { style: styles.kpiLabel },
            "Completion"
          ),
          React.createElement(
            Text,
            { style: styles.kpiValue },
            data.kpis.completionRate !== null
              ? `${data.kpis.completionRate}%`
              : "--"
          )
        )
      ),
      // Inspections Table
      React.createElement(
        Text,
        { style: styles.sectionTitle },
        "Inspections"
      ),
      React.createElement(
        View,
        { style: styles.tableHeader },
        React.createElement(
          Text,
          { style: { ...styles.tableHeaderText, ...styles.cellMd } },
          "Space"
        ),
        React.createElement(
          Text,
          { style: { ...styles.tableHeaderText, ...styles.cellMd } },
          "Inspector"
        ),
        React.createElement(
          Text,
          { style: { ...styles.tableHeaderText, ...styles.cellSm } },
          "Date"
        ),
        React.createElement(
          Text,
          { style: { ...styles.tableHeaderText, ...styles.cellSm } },
          "Result"
        )
      ),
      ...data.inspections.map((insp, idx) =>
        React.createElement(
          View,
          { key: idx, style: styles.tableRow },
          React.createElement(
            Text,
            { style: styles.cellMd },
            insp.spaceName
          ),
          React.createElement(
            Text,
            { style: styles.cellMd },
            insp.inspectorName
          ),
          React.createElement(
            Text,
            { style: styles.cellSm },
            new Date(insp.completedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          ),
          React.createElement(
            View,
            { style: styles.cellSm },
            React.createElement(
              Text,
              {
                style: {
                  ...styles.badge,
                  ...(insp.failCount === 0
                    ? styles.passBadge
                    : styles.failBadge),
                },
              },
              `${insp.passCount}/${insp.passCount + insp.failCount}`
            )
          )
        )
      ),
      // Detailed Responses (failed items with photos)
      ...data.inspections
        .filter((insp) => insp.responses.some((r) => r.result === "fail"))
        .map((insp, idx) =>
          React.createElement(
            View,
            { key: `detail-${idx}`, wrap: false },
            React.createElement(
              Text,
              {
                style: {
                  ...styles.sectionTitle,
                  fontSize: 12,
                  ...(idx === 0 ? {} : { marginTop: 8 }),
                },
              },
              `${insp.spaceName} — Failed Items`
            ),
            ...insp.responses
              .filter((r) => r.result === "fail")
              .map((r, rIdx) =>
                React.createElement(
                  View,
                  {
                    key: rIdx,
                    style: {
                      marginBottom: 8,
                      padding: 8,
                      backgroundColor: "#FEF2F2",
                      borderRadius: 4,
                    },
                  },
                  React.createElement(
                    Text,
                    { style: { fontSize: 10, fontFamily: "Helvetica-Bold" } },
                    r.itemDescription
                  ),
                  r.comment
                    ? React.createElement(
                        Text,
                        {
                          style: {
                            fontSize: 9,
                            color: "#64748B",
                            marginTop: 2,
                          },
                        },
                        r.comment
                      )
                    : null,
                  r.photoUrls.length > 0
                    ? React.createElement(
                        View,
                        {
                          style: {
                            flexDirection: "row",
                            flexWrap: "wrap",
                            marginTop: 4,
                            gap: 4,
                          },
                        },
                        ...r.photoUrls.map((url, pIdx) =>
                          React.createElement(Image, {
                            key: pIdx,
                            src: url,
                            style: styles.photo,
                          })
                        )
                      )
                    : null
                )
              )
          )
        ),
      // Deficiencies
      data.deficiencies.length > 0 &&
        React.createElement(
          View,
          { wrap: false },
          React.createElement(
            Text,
            { style: styles.sectionTitle },
            "Open Deficiencies"
          ),
          ...data.deficiencies.map((def, idx) =>
            React.createElement(
              View,
              { key: idx, style: styles.tableRow },
              React.createElement(
                Text,
                {
                  style: {
                    ...styles.cellSm,
                    fontFamily: "Courier",
                    fontSize: 9,
                  },
                },
                def.number
              ),
              React.createElement(
                Text,
                { style: styles.cellMd },
                def.spaceName
              ),
              React.createElement(
                View,
                { style: styles.cellSm },
                React.createElement(
                  Text,
                  {
                    style: {
                      ...styles.badge,
                      ...(def.status === "closed"
                        ? styles.passBadge
                        : styles.failBadge),
                    },
                  },
                  def.status.replace("_", " ")
                )
              ),
              React.createElement(
                Text,
                { style: styles.cellMd },
                new Date(def.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              )
            )
          )
        ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, null, "SpaceOps Inspection Report"),
        React.createElement(
          Text,
          { render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` } as never
        )
      )
    )
  );
}
