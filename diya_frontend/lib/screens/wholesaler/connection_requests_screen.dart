import 'package:flutter/material.dart';
import '../../models/connections/connection_response_dto.dart';
import '../../services/connection_service.dart';
import '../../widgets/ui/diya_button.dart';

class ConnectionRequestsScreen extends StatefulWidget {
  const ConnectionRequestsScreen({super.key});

  @override
  State<ConnectionRequestsScreen> createState() => _ConnectionRequestsScreenState();
}

class _ConnectionRequestsScreenState extends State<ConnectionRequestsScreen> {
  final ConnectionService _connectionService = ConnectionService();

  bool _loading = true;
  List<ConnectionResponseDTO> _requests = [];

  @override
  void initState() {
    super.initState();
    _loadRequests();
  }

  Future<void> _loadRequests() async {
    setState(() => _loading = true);
    try {
      final list = await _connectionService.pendingRequestsForWholesaler();
      if (!mounted) return;
      setState(() {
        _requests = list;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Failed to load requests: $e")),
      );
    }
  }

  Future<void> _updateStatus(ConnectionResponseDTO req, String status) async {
    try {
      await _connectionService.updateConnectionStatus(
        connectionId: req.id,
        status: status,
      );

      if (!mounted) return;

      setState(() {
        _requests.removeWhere((r) => r.id == req.id);
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(status == "APPROVED" ? "Approved ✅" : "Rejected ❌")),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Action failed: $e")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text("Connection Requests"),
        backgroundColor: Colors.white,
        elevation: 0.5,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _requests.isEmpty
              ? const Center(
                  child: Text(
                    "No pending requests",
                    style: TextStyle(color: Color(0xFF737373)),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadRequests,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _requests.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (_, i) {
                      final r = _requests[i];

                      return Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFF5F5F5)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              r.retailerBusinessName ?? "Retailer",
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              "${r.retailerCity ?? ""} • ${r.retailerPhone ?? ""}",
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF737373),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: DiyaButton(
                                    text: "Reject",
                                    variant: DiyaButtonVariant.outline,
                                    size: DiyaButtonSize.sm,
                                    onPressed: () => _updateStatus(r, "REJECTED"),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: DiyaButton(
                                    text: "Approve",
                                    variant: DiyaButtonVariant.primary,
                                    size: DiyaButtonSize.sm,
                                    onPressed: () => _updateStatus(r, "APPROVED"),
                                  ),
                                ),
                              ],
                            )
                          ],
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
