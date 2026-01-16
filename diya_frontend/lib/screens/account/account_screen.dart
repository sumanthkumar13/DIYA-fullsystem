import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/ui/diya_button.dart';
import '../../widgets/ui/diya_card.dart';

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // No /me endpoint yet -> placeholders
    const name = "User Name";
    const role = "Retailer";
    const shopName = "N/A";
    const mobile = "N/A";
    const location = "N/A";

    // ✅ IMPORTANT:
    // Do NOT wrap with RetailerShell here.
    // main.dart already wraps /account with RetailerShell.

    return Column(
      children: [
        const SizedBox(height: 10),

        // Avatar
        Container(
          width: 96,
          height: 96,
          decoration: BoxDecoration(
            color: const Color(0xFFE5E5E5),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 4),
            boxShadow: const [
              BoxShadow(
                color: Color(0x22000000),
                blurRadius: 18,
                offset: Offset(0, 10),
              )
            ],
          ),
          child: const Icon(Icons.person_outline, size: 40, color: Color(0xFFA3A3A3)),
        ),

        const SizedBox(height: 12),

        const Text(
          name,
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF171717)),
        ),
        const SizedBox(height: 4),
        const Text(
          role,
          style: TextStyle(color: Color(0xFF737373), fontWeight: FontWeight.w600),
        ),

        const SizedBox(height: 22),

        // Profile details
        DiyaCard(
          child: Column(
            children: const [
              _DetailRow(
                icon: Icons.store_mall_directory_outlined,
                title: "SHOP NAME",
                value: shopName,
              ),
              Divider(height: 22, color: Color(0xFFF5F5F5)),
              _DetailRow(
                icon: Icons.phone_outlined,
                title: "MOBILE",
                value: mobile,
              ),
              Divider(height: 22, color: Color(0xFFF5F5F5)),
              _DetailRow(
                icon: Icons.location_on_outlined,
                title: "LOCATION",
                value: location,
              ),
            ],
          ),
        ),

        const SizedBox(height: 18),

        // Menu
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFF5F5F5)),
            boxShadow: const [
              BoxShadow(color: Color(0x0A000000), blurRadius: 10, offset: Offset(0, 4))
            ],
          ),
          child: Column(
            children: [
              _MenuItem(
                icon: Icons.description_outlined,
                label: "Terms & Conditions",
                onTap: () {},
              ),
              const Divider(height: 1, color: Color(0xFFF5F5F5), indent: 16, endIndent: 16),
              _MenuItem(
                icon: Icons.help_outline,
                label: "Help & Support",
                onTap: () {},
              ),
            ],
          ),
        ),

        const SizedBox(height: 22),

        // Logout
        DiyaButton(
          fullWidth: true,
          variant: DiyaButtonVariant.destructive,
          text: "Logout",
          onPressed: () async {
            await ref.read(authProvider.notifier).logout();
            if (context.mounted) {
              Navigator.pushReplacementNamed(context, '/login');
            }
          },
        ),

        const SizedBox(height: 18),

        const Text(
          "Version 1.0.0",
          style: TextStyle(fontSize: 12, color: Color(0xFFA3A3A3), fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 10),
      ],
    );
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;

  const _DetailRow({
    required this.icon,
    required this.title,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 42,
          height: 42,
          decoration: const BoxDecoration(
            color: Color(0xFFFF7A00),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.circle, color: Colors.transparent),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFFA3A3A3),
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF404040),
                ),
              )
            ],
          ),
        ),
        Icon(icon, color: const Color(0xFFFF7A00), size: 22),
      ],
    );
  }
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _MenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(icon, size: 20, color: const Color(0xFF737373)),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF404040),
                ),
              ),
            ),
            const Icon(Icons.chevron_right, size: 20, color: Color(0xFFA3A3A3)),
          ],
        ),
      ),
    );
  }
}
