import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import type { Room, CreateRoomData } from '../types/room';

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Room[]>('/rooms');
      setRooms(data);
    } catch {
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const createRoom = useCallback(async (dto: CreateRoomData): Promise<Room> => {
    const { data } = await api.post<Room>('/rooms', dto);
    setRooms((prev) => [data, ...prev]);
    return data;
  }, []);

  const deleteRoom = useCallback(async (roomId: string): Promise<void> => {
    await api.delete(`/rooms/${roomId}`);
    setRooms((prev) => prev.filter((r) => r.roomId !== roomId));
  }, []);

  return { rooms, loading, error, fetchRooms, createRoom, deleteRoom };
}
