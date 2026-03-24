import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/home_models.dart';
import '../services/auth_state.dart';
import '../utils/format.dart';
import 'auth/login_screen.dart';

class CreateListingScreen extends StatefulWidget {
  const CreateListingScreen({super.key, this.initialZoneId});

  final String? initialZoneId;

  @override
  State<CreateListingScreen> createState() => _CreateListingScreenState();
}

class _CreateListingScreenState extends State<CreateListingScreen> {
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _priceController = TextEditingController();
  final _areaController = TextEditingController();
  final _bedroomsController = TextEditingController();
  final _bathroomsController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _whatsAppController = TextEditingController();
  final _instagramController = TextEditingController();
  final _facebookController = TextEditingController();
  final _websiteController = TextEditingController();
  final _imagesController = TextEditingController();

  bool _loadingZones = true;
  bool _loadingMyListings = false;
  bool _saving = false;
  String? _listingActionId;
  String? _feedback;
  List<ZoneSummary> _zones = const [];
  List<ListingOffer> _myListings = const [];
  String? _zoneId;
  String _purpose = 'rent';
  String _type = 'apartment';

  @override
  void initState() {
    super.initState();
    _imagesController.text =
        'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg';
    _loadZones();
    _loadMyListings();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _areaController.dispose();
    _bedroomsController.dispose();
    _bathroomsController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _whatsAppController.dispose();
    _instagramController.dispose();
    _facebookController.dispose();
    _websiteController.dispose();
    _imagesController.dispose();
    super.dispose();
  }

  Future<bool> _ensureAuthenticated() async {
    final auth = context.read<AuthState>();
    if (auth.isAuthenticated) {
      return true;
    }

    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
    final authenticated = mounted && auth.isAuthenticated;
    if (authenticated) {
      await _loadMyListings();
    }
    return authenticated;
  }

  Future<void> _loadZones() async {
    final auth = context.read<AuthState>();
    setState(() => _loadingZones = true);
    try {
      final zones = await auth.api.getZones();
      if (!mounted) return;
      setState(() {
        _zones = zones;
        _zoneId =
            widget.initialZoneId ??
            (zones.isNotEmpty ? zones.first.id : _zoneId);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _feedback = 'Could not load zones: $e');
    } finally {
      if (mounted) {
        setState(() => _loadingZones = false);
      }
    }
  }

  Future<void> _loadMyListings() async {
    final auth = context.read<AuthState>();
    if (!auth.isAuthenticated) {
      if (mounted) {
        setState(() => _myListings = const []);
      }
      return;
    }

    setState(() => _loadingMyListings = true);
    try {
      final listings = await auth.api.getMyListings();
      if (!mounted) return;
      setState(() => _myListings = listings);
    } catch (_) {
      if (!mounted) return;
      setState(() => _myListings = const []);
    } finally {
      if (mounted) {
        setState(() => _loadingMyListings = false);
      }
    }
  }

  String _nextStatus(String currentStatus) {
    if (currentStatus == 'active') {
      return 'paused';
    }
    return 'active';
  }

  Future<void> _changeListingStatus(ListingOffer listing, String status) async {
    final auth = context.read<AuthState>();
    setState(() {
      _listingActionId = listing.id;
      _feedback = null;
    });
    try {
      await auth.api.updateListing(listing.id, {'status': status});
      if (!mounted) return;
      setState(() => _feedback = 'Listing status updated to $status.');
      await _loadMyListings();
    } catch (e) {
      if (!mounted) return;
      setState(() => _feedback = 'Could not update listing: $e');
    } finally {
      if (mounted) {
        setState(() => _listingActionId = null);
      }
    }
  }

  Future<void> _deleteListing(ListingOffer listing) async {
    final auth = context.read<AuthState>();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete listing'),
        content: const Text(
          'Delete this listing permanently? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (!mounted) return;
    if (confirmed != true) {
      return;
    }
    setState(() {
      _listingActionId = listing.id;
      _feedback = null;
    });

    try {
      await auth.api.deleteListing(listing.id);
      if (!mounted) return;
      setState(() => _feedback = 'Listing deleted.');
      await _loadMyListings();
    } catch (e) {
      if (!mounted) return;
      setState(() => _feedback = 'Could not delete listing: $e');
    } finally {
      if (mounted) {
        setState(() => _listingActionId = null);
      }
    }
  }

  Future<void> _editListing(ListingOffer listing) async {
    final auth = context.read<AuthState>();
    final titleController = TextEditingController(text: listing.title);
    final descriptionController = TextEditingController(
      text: listing.description ?? '',
    );
    final priceController = TextEditingController(
      text:
          (listing.purpose == 'rent' ? listing.priceMonthly : listing.priceSale)
              ?.toString() ??
          '',
    );
    final areaController = TextEditingController(
      text: listing.areaM2?.toString() ?? '',
    );
    final bedroomsController = TextEditingController(
      text: listing.bedrooms?.toString() ?? '',
    );
    final bathroomsController = TextEditingController(
      text: listing.bathrooms?.toString() ?? '',
    );
    final phoneController = TextEditingController(
      text: listing.contactPhone ?? '',
    );
    final emailController = TextEditingController(
      text: listing.contactEmail ?? '',
    );
    final whatsAppController = TextEditingController(
      text: listing.contactWhatsApp ?? '',
    );
    final instagramController = TextEditingController(
      text: listing.contactInstagram ?? '',
    );
    final facebookController = TextEditingController(
      text: listing.contactFacebook ?? '',
    );
    final websiteController = TextEditingController(
      text: listing.contactWebsite ?? '',
    );
    var nextStatus = listing.status;

    final save = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) => AlertDialog(
          title: const Text('Edit listing'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: titleController,
                  decoration: const InputDecoration(labelText: 'Title'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: descriptionController,
                  minLines: 2,
                  maxLines: 4,
                  decoration: const InputDecoration(labelText: 'Description'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: priceController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: listing.purpose == 'rent'
                        ? 'Monthly price (DH)'
                        : 'Sale price (DH)',
                  ),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: nextStatus,
                  decoration: const InputDecoration(labelText: 'Status'),
                  items: const [
                    DropdownMenuItem(value: 'active', child: Text('active')),
                    DropdownMenuItem(value: 'paused', child: Text('paused')),
                    DropdownMenuItem(value: 'closed', child: Text('closed')),
                  ],
                  onChanged: (value) {
                    if (value == null) return;
                    setDialogState(() => nextStatus = value);
                  },
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: areaController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Area m²'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: bedroomsController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Bedrooms',
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: bathroomsController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Bathrooms',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: phoneController,
                        decoration: const InputDecoration(labelText: 'Phone'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: emailController,
                        decoration: const InputDecoration(labelText: 'Email'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: whatsAppController,
                        decoration: const InputDecoration(
                          labelText: 'WhatsApp',
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: instagramController,
                        decoration: const InputDecoration(
                          labelText: 'Instagram',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: facebookController,
                        decoration: const InputDecoration(
                          labelText: 'Facebook',
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: websiteController,
                        decoration: const InputDecoration(labelText: 'Website'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );

    if (!mounted) return;
    final title = titleController.text.trim();
    final description = descriptionController.text.trim();
    final price = double.tryParse(priceController.text.trim());
    final areaM2 = _parseNumber(areaController.text);
    final bedrooms = _parseNumber(bedroomsController.text)?.round();
    final bathrooms = _parseNumber(bathroomsController.text)?.round();
    final contactPhone = phoneController.text.trim();
    final contactEmail = emailController.text.trim();
    final contactWhatsApp = whatsAppController.text.trim();
    final contactInstagram = instagramController.text.trim();
    final contactFacebook = facebookController.text.trim();
    final contactWebsite = websiteController.text.trim();
    titleController.dispose();
    descriptionController.dispose();
    priceController.dispose();
    areaController.dispose();
    bedroomsController.dispose();
    bathroomsController.dispose();
    phoneController.dispose();
    emailController.dispose();
    whatsAppController.dispose();
    instagramController.dispose();
    facebookController.dispose();
    websiteController.dispose();

    if (save != true) {
      return;
    }
    if (title.length < 3) {
      setState(() => _feedback = 'Title must be at least 3 characters.');
      return;
    }

    setState(() {
      _listingActionId = listing.id;
      _feedback = null;
    });
    try {
      final payload = <String, dynamic>{
        'title': title,
        if (description.isNotEmpty) 'description': description,
        if (listing.purpose == 'rent' && price != null) 'priceMonthly': price,
        if (listing.purpose == 'buy' && price != null) 'priceSale': price,
        if (nextStatus != listing.status) 'status': nextStatus,
        if (areaM2 != null) 'areaM2': areaM2,
        if (bedrooms != null) 'bedrooms': bedrooms,
        if (bathrooms != null) 'bathrooms': bathrooms,
        if (contactPhone.isNotEmpty) 'contactPhone': contactPhone,
        if (contactEmail.isNotEmpty) 'contactEmail': contactEmail,
        if (contactWhatsApp.isNotEmpty) 'contactWhatsApp': contactWhatsApp,
        if (contactInstagram.isNotEmpty) 'contactInstagram': contactInstagram,
        if (contactFacebook.isNotEmpty) 'contactFacebook': contactFacebook,
        if (contactWebsite.isNotEmpty) 'contactWebsite': contactWebsite,
      };
      await auth.api.updateListing(listing.id, payload);
      if (!mounted) return;
      setState(() => _feedback = 'Listing updated.');
      await _loadMyListings();
    } catch (e) {
      if (!mounted) return;
      setState(() => _feedback = 'Could not update listing: $e');
    } finally {
      if (mounted) {
        setState(() => _listingActionId = null);
      }
    }
  }

  double? _parseNumber(String raw) {
    final value = raw.trim();
    if (value.isEmpty) return null;
    return double.tryParse(value);
  }

  Future<void> _submit() async {
    final auth = context.read<AuthState>();
    if (!await _ensureAuthenticated()) {
      setState(() => _feedback = 'Please sign in to post your property.');
      return;
    }

    if (_zoneId == null || _zoneId!.isEmpty) {
      setState(() => _feedback = 'Please choose a zone.');
      return;
    }

    final imageUrls = _imagesController.text
        .split(RegExp(r'[\n,]'))
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toList();
    if (imageUrls.isEmpty) {
      setState(() => _feedback = 'Please add at least one image URL.');
      return;
    }

    setState(() {
      _saving = true;
      _feedback = null;
    });

    try {
      final payload = <String, dynamic>{
        'zoneId': _zoneId,
        'title': _titleController.text.trim(),
        'description': _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
        'type': _type,
        'purpose': _purpose,
        if (_purpose == 'rent')
          'priceMonthly': _parseNumber(_priceController.text),
        if (_purpose == 'buy') 'priceSale': _parseNumber(_priceController.text),
        if (_parseNumber(_areaController.text) != null)
          'areaM2': _parseNumber(_areaController.text),
        if (_parseNumber(_bedroomsController.text) != null)
          'bedrooms': _parseNumber(_bedroomsController.text)?.round(),
        if (_parseNumber(_bathroomsController.text) != null)
          'bathrooms': _parseNumber(_bathroomsController.text)?.round(),
        if (_phoneController.text.trim().isNotEmpty)
          'contactPhone': _phoneController.text.trim(),
        if (_emailController.text.trim().isNotEmpty)
          'contactEmail': _emailController.text.trim(),
        if (_whatsAppController.text.trim().isNotEmpty)
          'contactWhatsApp': _whatsAppController.text.trim(),
        if (_instagramController.text.trim().isNotEmpty)
          'contactInstagram': _instagramController.text.trim(),
        if (_facebookController.text.trim().isNotEmpty)
          'contactFacebook': _facebookController.text.trim(),
        if (_websiteController.text.trim().isNotEmpty)
          'contactWebsite': _websiteController.text.trim(),
        'imageUrls': imageUrls,
      };

      final listing = await auth.api.createListing(payload);
      if (!mounted) return;
      setState(() {
        _feedback = 'Listing posted: ${listing.title}';
      });
      _titleController.clear();
      _descriptionController.clear();
      _priceController.clear();
      _areaController.clear();
      _bedroomsController.clear();
      _bathroomsController.clear();
      _phoneController.clear();
      _emailController.clear();
      _whatsAppController.clear();
      _instagramController.clear();
      _facebookController.clear();
      _websiteController.clear();
      _imagesController.clear();
      await _loadMyListings();
    } catch (e) {
      if (!mounted) return;
      setState(() => _feedback = 'Could not post listing: $e');
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final signedIn = auth.isAuthenticated;
    return Scaffold(
      appBar: AppBar(title: const Text('Post listing')),
      body: SafeArea(
        child: !signedIn
            ? Center(
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'Please sign in first to access Sell/Rent.',
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 10),
                        FilledButton(
                          onPressed: () async {
                            final navigator = Navigator.of(context);
                            final authState = context.read<AuthState>();
                            await navigator.push(
                              MaterialPageRoute(
                                builder: (_) => const LoginScreen(),
                              ),
                            );
                            if (!mounted) return;
                            if (authState.isAuthenticated) {
                              await _loadMyListings();
                            }
                            if (!authState.isAuthenticated) {
                              navigator.maybePop();
                            }
                          },
                          child: const Text('Sign in'),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            : _loadingZones
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 760),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Create a rent/sale offer',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              auth.isAuthenticated
                                  ? 'Signed in as ${auth.email ?? 'user'}'
                                  : 'Sign in to publish your listing',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                            const SizedBox(height: 16),
                            DropdownButtonFormField<String>(
                              initialValue: _zoneId,
                              isExpanded: true,
                              decoration: const InputDecoration(
                                labelText: 'Zone',
                              ),
                              items: _zones
                                  .map(
                                    (zone) => DropdownMenuItem(
                                      value: zone.id,
                                      child: Text(
                                        '${zone.name} - ${zone.city}',
                                      ),
                                    ),
                                  )
                                  .toList(),
                              onChanged: (value) =>
                                  setState(() => _zoneId = value),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: DropdownButtonFormField<String>(
                                    initialValue: _purpose,
                                    isExpanded: true,
                                    decoration: const InputDecoration(
                                      labelText: 'Purpose',
                                    ),
                                    items: const [
                                      DropdownMenuItem(
                                        value: 'rent',
                                        child: Text('Rent'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'buy',
                                        child: Text('Sale'),
                                      ),
                                    ],
                                    onChanged: (value) => setState(
                                      () => _purpose = value ?? 'rent',
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: DropdownButtonFormField<String>(
                                    initialValue: _type,
                                    isExpanded: true,
                                    decoration: const InputDecoration(
                                      labelText: 'Property type',
                                    ),
                                    items: const [
                                      DropdownMenuItem(
                                        value: 'apartment',
                                        child: Text('Apartment'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'house',
                                        child: Text('House'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'studio',
                                        child: Text('Studio'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'villa',
                                        child: Text('Villa'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'land',
                                        child: Text('Land'),
                                      ),
                                    ],
                                    onChanged: (value) =>
                                        setState(() => _type = value ?? _type),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            TextField(
                              controller: _titleController,
                              decoration: const InputDecoration(
                                labelText: 'Title',
                              ),
                            ),
                            const SizedBox(height: 10),
                            TextField(
                              controller: _descriptionController,
                              maxLines: 3,
                              decoration: const InputDecoration(
                                labelText: 'Description',
                              ),
                            ),
                            const SizedBox(height: 10),
                            TextField(
                              controller: _priceController,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: _purpose == 'rent'
                                    ? 'Monthly price (DH)'
                                    : 'Sale price (DH)',
                              ),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _areaController,
                                    keyboardType: TextInputType.number,
                                    decoration: const InputDecoration(
                                      labelText: 'Area m²',
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: TextField(
                                    controller: _bedroomsController,
                                    keyboardType: TextInputType.number,
                                    decoration: const InputDecoration(
                                      labelText: 'Bedrooms',
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: TextField(
                                    controller: _bathroomsController,
                                    keyboardType: TextInputType.number,
                                    decoration: const InputDecoration(
                                      labelText: 'Bathrooms',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            TextField(
                              controller: _phoneController,
                              decoration: const InputDecoration(
                                labelText: 'Phone (optional)',
                              ),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _emailController,
                                    decoration: const InputDecoration(
                                      labelText: 'Email (optional)',
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: TextField(
                                    controller: _whatsAppController,
                                    decoration: const InputDecoration(
                                      labelText: 'WhatsApp (optional)',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _instagramController,
                                    decoration: const InputDecoration(
                                      labelText: 'Instagram (optional)',
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: TextField(
                                    controller: _facebookController,
                                    decoration: const InputDecoration(
                                      labelText: 'Facebook (optional)',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            TextField(
                              controller: _websiteController,
                              decoration: const InputDecoration(
                                labelText: 'Website (optional)',
                              ),
                            ),
                            const SizedBox(height: 10),
                            TextField(
                              controller: _imagesController,
                              minLines: 2,
                              maxLines: 4,
                              decoration: const InputDecoration(
                                labelText: 'Image URLs (comma or new line)',
                              ),
                            ),
                            const SizedBox(height: 14),
                            FilledButton.icon(
                              onPressed: _saving ? null : _submit,
                              icon: const Icon(Icons.publish_outlined),
                              label: Text(
                                _saving ? 'Posting...' : 'Publish listing',
                              ),
                            ),
                            const SizedBox(height: 8),
                            if (_feedback != null)
                              Text(
                                _feedback!,
                                style: const TextStyle(
                                  color: Color(0xFF2E5B45),
                                ),
                              ),
                            const SizedBox(height: 8),
                            Text(
                              'Tip: add clear photos for room, kitchen, bathroom and facade.',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                            if (_purpose == 'rent' &&
                                _priceController.text.trim().isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: Text(
                                  'Preview: ${formatDh(double.tryParse(_priceController.text) ?? 0)} / month',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ),
                            const SizedBox(height: 18),
                            const Divider(),
                            const SizedBox(height: 10),
                            Text(
                              'My listings',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 8),
                            if (_loadingMyListings)
                              const Center(child: CircularProgressIndicator())
                            else if (_myListings.isEmpty)
                              const Text('No listings yet.')
                            else
                              ..._myListings.map(
                                (listing) => Card(
                                  child: Padding(
                                    padding: const EdgeInsets.all(10),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          listing.title,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${listing.purpose.toUpperCase()} • ${listing.status}',
                                        ),
                                        Text(
                                          listing.purpose == 'rent'
                                              ? '${formatDh(listing.priceMonthly ?? 0)} / month'
                                              : formatDh(
                                                  listing.priceSale ?? 0,
                                                ),
                                        ),
                                        const SizedBox(height: 8),
                                        Wrap(
                                          spacing: 8,
                                          runSpacing: 8,
                                          children: [
                                            OutlinedButton(
                                              onPressed:
                                                  _listingActionId == listing.id
                                                  ? null
                                                  : () => _editListing(listing),
                                              child: const Text('Edit'),
                                            ),
                                            OutlinedButton(
                                              onPressed:
                                                  _listingActionId == listing.id
                                                  ? null
                                                  : () => _changeListingStatus(
                                                      listing,
                                                      _nextStatus(
                                                        listing.status,
                                                      ),
                                                    ),
                                              child: Text(
                                                listing.status == 'active'
                                                    ? 'Pause'
                                                    : 'Activate',
                                              ),
                                            ),
                                            OutlinedButton(
                                              onPressed:
                                                  _listingActionId ==
                                                          listing.id ||
                                                      listing.status == 'closed'
                                                  ? null
                                                  : () => _changeListingStatus(
                                                      listing,
                                                      'closed',
                                                    ),
                                              child: const Text('Close'),
                                            ),
                                            FilledButton.tonal(
                                              onPressed:
                                                  _listingActionId == listing.id
                                                  ? null
                                                  : () =>
                                                        _deleteListing(listing),
                                              child: const Text('Delete'),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
      ),
    );
  }
}
