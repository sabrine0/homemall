interface FavoriteItem {
  id: string;
  userId: string;
  zoneId: string;
  note?: string;
  createdAt: string;
}

// In-memory favorites store used for demo mode.
// Replace with Prisma persistence when adding a Favorite model.
const favoritesByUser = new Map<string, FavoriteItem[]>();

export class FavoritesService {
  list(userId: string): FavoriteItem[] {
    return favoritesByUser.get(userId) ?? [];
  }

  add(userId: string, zoneId: string, note?: string): FavoriteItem {
    const current = favoritesByUser.get(userId) ?? [];

    const existing = current.find((item) => item.zoneId === zoneId);
    if (existing) {
      existing.note = note;
      return existing;
    }

    const favorite: FavoriteItem = {
      id: `fav_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      userId,
      zoneId,
      note,
      createdAt: new Date().toISOString()
    };

    current.push(favorite);
    favoritesByUser.set(userId, current);
    return favorite;
  }
}
