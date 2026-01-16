import 'package:flutter/material.dart';
import '../../widgets/ui/diya_button.dart';
import '../../widgets/ui/diya_card.dart';
import '../../widgets/ui/diya_input.dart';

class PaymentsScreen extends StatefulWidget {
  const PaymentsScreen({super.key});

  @override
  State<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends State<PaymentsScreen> {
  bool loading = false;

  // mock ledger
  String balance = "0";

  final List<Map<String, dynamic>> payments = [
    {"amount": "450", "date": DateTime.now()},
    {"amount": "1200", "date": DateTime.now()},
  ];

  final _amountController = TextEditingController();

  Future<void> _showPayDialog() async {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 18,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 46,
                height: 5,
                decoration: BoxDecoration(
                  color: const Color(0xFFE5E5E5),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                "Make Payment",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 18),

              // QR placeholder
              Container(
                width: 190,
                height: 190,
                decoration: BoxDecoration(
                  color: const Color(0xFFF5F5F5),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: const Color(0xFFD4D4D4),
                    width: 2,
                    style: BorderStyle.solid,
                  ),
                ),
                child: const Center(
                  child: Icon(Icons.qr_code_2, size: 74, color: Color(0xFFA3A3A3)),
                ),
              ),

              const SizedBox(height: 18),

              DiyaInput(
                hintText: "Enter Amount",
                controller: _amountController,
                keyboardType: TextInputType.number,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                ),
              ),

              const SizedBox(height: 18),

              DiyaButton(
                fullWidth: true,
                text: "Confirm Payment",
                onPressed: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Payment Successful (UI mock) ✅")),
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // ✅ IMPORTANT:
    // This screen must NOT return RetailerShell or Scaffold.
    // main.dart already wraps /payments with RetailerShell.

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Outstanding Card
        Container(
          margin: const EdgeInsets.only(top: 8),
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF171717), Color(0xFF262626)],
            ),
            borderRadius: BorderRadius.circular(24),
            boxShadow: const [
              BoxShadow(
                color: Color(0x33000000),
                blurRadius: 24,
                offset: Offset(0, 12),
              )
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "Total Outstanding",
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFFA3A3A3),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                "₹$balance",
                style: const TextStyle(
                  fontSize: 38,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 18),

              // Pay now button (white)
              DiyaButton(
                fullWidth: true,
                text: "Pay Now",
                variant: DiyaButtonVariant.secondary,
                onPressed: _showPayDialog,
              ),
            ],
          ),
        ),

        const SizedBox(height: 26),

        const Text(
          "Recent Transactions",
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w900,
            color: Color(0xFF171717),
          ),
        ),
        const SizedBox(height: 14),

        if (loading) ...[
          ...List.generate(
            2,
            (i) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Container(
                height: 64,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          )
        ] else if (payments.isEmpty) ...[
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 30),
            child: Center(
              child: Text("No payment history", style: TextStyle(color: Color(0xFF737373))),
            ),
          )
        ] else ...[
          ...payments.map((p) {
            final amount = p["amount"].toString();
            final date = p["date"] as DateTime;

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: DiyaCard(
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: const BoxDecoration(
                        color: Color(0xFFDCFCE7),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.arrow_upward, color: Color(0xFF16A34A), size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Payment Sent",
                            style: TextStyle(fontWeight: FontWeight.w900),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            "${date.day}/${date.month}/${date.year}",
                            style: const TextStyle(fontSize: 12, color: Color(0xFF737373)),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      "- ₹$amount",
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF16A34A),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ]
      ],
    );
  }
}
