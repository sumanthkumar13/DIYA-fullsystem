import api from "@/lib/axios";

export async function fetchKhatabookSummary() {
  const res = await api.get("/ledger/wholesaler/summary");
  return res.data;
}

export async function fetchKhatabookRetailers() {
  const res = await api.get("/ledger/wholesaler/retailers");
  return res.data.map((r: any) => {
    const retailerName = typeof r.retailerName === "string" ? r.retailerName.trim() : "";
    const shopName = typeof r.shopName === "string" ? r.shopName.trim() : "";
    const city = typeof r.city === "string" ? r.city.trim() : "";
    const phone = typeof r.phone === "string" ? r.phone.trim() : "";
    const name = shopName || retailerName || "Retailer";

    const initials = name
      .split(" ")
      .map((w: string) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const outstanding = Math.max(0, Number(r.totalDue ?? 0));
    const overdueDays = Number(r.overdueDays ?? 0);

    let status: string;
    if (outstanding <= 0) {
      status = "Settled";
    } else if (overdueDays > 7) {
      status = "Critical";
    } else if (overdueDays > 0) {
      status = "Pending";
    } else {
      status = "Due";
    }

    return {
      id: r.retailerId,
      name,
      retailerName,
      shopName,
      city,
      phone,
      outstanding,
      due: `₹${Number(r.totalDue || 0).toLocaleString("en-IN")}`,
      overdue: `₹${Number(r.overdueAmount || 0).toLocaleString("en-IN")}`,
      lastPayment: r.lastPaymentDate
        ? new Date(r.lastPaymentDate).toLocaleDateString("en-IN")
        : "No payment",
      status,
      initials: initials || "?",
    };
  });
}

export async function fetchRetailerStatement(retailerId: string) {
  const res = await api.get(`/ledger/wholesaler/retailer/${retailerId}/statement`);
  return res.data;
}
