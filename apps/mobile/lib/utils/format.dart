String formatDh(num value) {
  final rounded = value.round();
  final isNegative = rounded < 0;
  final absolute = rounded.abs().toString();
  final withGrouping = absolute.replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => ' ',
  );
  return '${isNegative ? '-' : ''}$withGrouping DH';
}

