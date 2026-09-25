import {Router} from 'express';
import {db} from '../../config/database';

export const trackingRouter = Router();

trackingRouter.get('/live', async (_req, res) => {
  const trips = await db.list('trips', {status: 'DISPATCHED'});
  const locations = await db.list('tracking_locations');
  res.json(trips.map((trip: any) => ({
    ...trip,
    ...(locations.find((l: any) => l.tripID === trip.tripID) ?? {latitude: 23.0225, longitude: 72.5714, speed: 35})
  })));
});

trackingRouter.post('/location', async (req, res) => {
  res.status(201).json({success: true, data: await db.insert('tracking_locations', {id: db.makeId('loc-'), ...req.body})});
});
