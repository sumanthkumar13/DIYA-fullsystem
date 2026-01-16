import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/wholesaler_search_model.dart';
import '../../services/connection_service.dart';
import '../../services/wholesaler_discovery_service.dart';
import '../../widgets/ui/diya_button.dart';
import '../../providers/selected_wholesaler_provider.dart';

// ⚠️ Assuming this provider exists somewhere in your app
// import '../../providers/selected_wholesaler_provider.dart';

class ConnectScreen extends ConsumerStatefulWidget {
  const ConnectScreen({super.key});

  @override
  ConsumerState<ConnectScreen> createState() => _ConnectScreenState();
}

class _ConnectScreenState extends ConsumerState<ConnectScreen> {
  final _searchController = TextEditingController();

  final _wholesalerService = WholesalerDiscoveryService();
  final _connectionService = ConnectionService();

  bool _loading = true;
  bool _searching = false;

  List<WholesalerSearchModel> _wholesalers = [];

  // wholesalerId -> status
  final Map<String, String> _connectionStatus = {};

  int get _connectedCount =>
      _connectionStatus.values.where((s) => s == "APPROVED").length;

  int get _requestedCount =>
      _connectionStatus.values.where((s) => s == "PENDING").length;

  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _loadConnectionsOnly();

    _searchController.addListener(() {
      _debouncedSearch();
    });
  }

  void _debouncedSearch() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      _search();
    });
  }

  Future<void> _loadConnectionsOnly() async {
    if (!mounted) return;
    setState(() => _loading = true);

    try {
      final connections = await _connectionService.myConnections();

      _connectionStatus.clear();
      for (final c in connections) {
        _connectionStatus[c.wholesalerId] = c.status;
      }

      if (!mounted) return;
      setState(() => _loading = false);
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Failed to load connections: $e")),
      );
    }
  }

  Future<void> _search() async {
    final q = _searchController.text.trim();

    if (q.isEmpty) {
      if (!mounted) return;
      setState(() {
        _wholesalers = [];
        _searching = false;
      });
      return;
    }

    try {
      if (!mounted) return;
      setState(() => _searching = true);

      final wholesalers = await _wholesalerService.searchWholesalers(q: q);

      if (!mounted) return;
      setState(() {
        _wholesalers = wholesalers;
        _searching = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _searching = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Search failed: $e")),
      );
    }
  }

  Future<void> _connect(String wholesalerId) async {
    try {
      if (!mounted) return;
      setState(() => _connectionStatus[wholesalerId] = "PENDING");

      await _connectionService.requestConnection(wholesalerId);
      await _loadConnectionsOnly();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Request sent! Await wholesaler approval.")),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _connectionStatus.remove(wholesalerId));

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Connection request failed: $e")),
      );
    }
  }

  void _finish() {
    Navigator.pushReplacementNamed(context, '/home');
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  String _renderLocation(WholesalerSearchModel w) {
    final parts = <String>[];
    if (w.city.isNotEmpty) parts.add(w.city);
    if (w.pincode.isNotEmpty) parts.add(w.pincode);
    return parts.isEmpty ? "Unknown" : parts.join(" • ");
  }

  Widget _statusPill(String text, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w800,
          color: fg,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final q = _searchController.text.trim();

    // ✅ IMPORTANT:
    // This screen must NOT return Scaffold.
    // It will be wrapped with RetailerShell in main.dart.

    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(bottom: BorderSide(color: Color(0xFFF5F5F5))),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
                  ),
                  const SizedBox(width: 4),
                  const Expanded(
                    child: Text(
                      "Connect Wholesalers",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF171717),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: _loadConnectionsOnly,
                    icon: const Icon(Icons.refresh_rounded),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                "Search wholesalers by shop name or invite code to connect.",
                style: TextStyle(
                  fontSize: 13,
                  color: Color(0xFF737373),
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 14),

              // Search input
              Stack(
                alignment: Alignment.centerLeft,
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFFAFAFA),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: TextField(
                      controller: _searchController,
                      decoration: const InputDecoration(
                        hintText: "Search by shop name or invite code...",
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.fromLTRB(40, 14, 14, 14),
                      ),
                    ),
                  ),
                  const Positioned(
                    left: 12,
                    child: Icon(
                      Icons.search,
                      size: 18,
                      color: Color(0xFFA3A3A3),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        // List
        Expanded(
          child: Container(
            color: const Color(0xFFFAFAFA),
            padding: const EdgeInsets.all(16),
            child: RefreshIndicator(
              onRefresh: () async {
                await _loadConnectionsOnly();
                if (_searchController.text.trim().isNotEmpty) {
                  await _search();
                }
              },
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : q.isEmpty
                      ? ListView(
                          children: const [
                            SizedBox(height: 120),
                            Center(
                              child: Text(
                                "Type wholesaler shop name (ex: Balaji)\nor invite code (DIYA-XXXX).",
                                textAlign: TextAlign.center,
                                style: TextStyle(color: Color(0xFFA3A3A3)),
                              ),
                            ),
                          ],
                        )
                      : _searching
                          ? const Center(child: CircularProgressIndicator())
                          : _wholesalers.isEmpty
                              ? ListView(
                                  children: const [
                                    SizedBox(height: 120),
                                    Center(
                                      child: Text(
                                        "No wholesalers found.",
                                        style: TextStyle(
                                          color: Color(0xFFA3A3A3),
                                        ),
                                      ),
                                    ),
                                  ],
                                )
                              : ListView.separated(
                                  itemCount: _wholesalers.length,
                                  separatorBuilder: (_, __) =>
                                      const SizedBox(height: 12),
                                  itemBuilder: (_, i) {
                                    final w = _wholesalers[i];
                                    final status = _connectionStatus[w.id];
                                    final isApproved = status == "APPROVED";
                                    final isPending = status == "PENDING";

                                    return Container(
                                      padding: const EdgeInsets.all(16),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(16),
                                        border: Border.all(
                                          color: const Color(0xFFF5F5F5),
                                        ),
                                      ),
                                      child: Row(
                                        children: [
                                          Container(
                                            width: 40,
                                            height: 40,
                                            decoration: const BoxDecoration(
                                              color: Color(0xFFDBEAFE),
                                              shape: BoxShape.circle,
                                            ),
                                            child: const Icon(
                                              Icons.store,
                                              size: 20,
                                              color: Color(0xFF2563EB),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  w.businessName,
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.w800,
                                                    color: Color(0xFF171717),
                                                  ),
                                                ),
                                                const SizedBox(height: 4),
                                                Text(
                                                  _renderLocation(w),
                                                  style: const TextStyle(
                                                    fontSize: 12,
                                                    color: Color(0xFF737373),
                                                  ),
                                                ),
                                                if (w.inviteCode.isNotEmpty) ...[
                                                  const SizedBox(height: 4),
                                                  Text(
                                                    "Invite: ${w.inviteCode}",
                                                    style: const TextStyle(
                                                      fontSize: 12,
                                                      fontWeight: FontWeight.w700,
                                                      color: Color(0xFF2563EB),
                                                    ),
                                                  )
                                                ],
                                              ],
                                            ),
                                          ),
                                          const SizedBox(width: 12),

                                          // ✅ FIXED CONDITIONAL WIDGET SECTION
                                          if (isApproved)
                                            Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                _statusPill(
                                                  "Connected",
                                                  const Color(0xFFDCFCE7),
                                                  const Color(0xFF16A34A),
                                                ),
                                                const SizedBox(width: 8),
                                                SizedBox(
                                                  height: 36,
                                                  child: DiyaButton(
                                                    text: "Shop",
                                                    size: DiyaButtonSize.sm,
                                                    variant: DiyaButtonVariant.primary,
                                                    onPressed: () {
                                                      // ✅ store wholesaler selection
                                                      ref
                                                          .read(selectedWholesalerIdProvider.notifier)
                                                          .state = w.id;

                                                      // ✅ go to home (or directly to new order screen)
                                                      Navigator.pushReplacementNamed(
                                                          context, '/home');
                                                    },
                                                  ),
                                                ),
                                              ],
                                            )
                                          else if (isPending)
                                            _statusPill(
                                              "Requested",
                                              const Color(0xFFE5E7EB),
                                              const Color(0xFF374151),
                                            )
                                          else
                                            SizedBox(
                                              height: 36,
                                              child: DiyaButton(
                                                text: "Connect",
                                                size: DiyaButtonSize.sm,
                                                variant: DiyaButtonVariant.primary,
                                                onPressed: () => _connect(w.id),
                                              ),
                                            ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
            ),
          ),
        ),

        // Done button
        Container(
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: Color(0xFFF5F5F5))),
          ),
          child: DiyaButton(
            fullWidth: true,
            text: "Done (Req: $_requestedCount)",
            onPressed: _requestedCount == 0 ? null : _finish,
          ),
        ),
      ],
    );
  }
}
