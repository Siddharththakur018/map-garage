import express from "express";
import { prisma } from "./src/lib/prisma.js";

const app = express();
app.use(express.json());

// Haversine: straight-line distance in km between two lat/lng points
function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

// Turns a garage's service rows into a clean list
function formatServices(garageServices) {
  return garageServices.map((gs) => ({
    serviceId: gs.service.id,
    name: gs.service.name,
    durationMinutes: gs.durationMinutes,
    price: gs.price,
  }));
}

// 1. All services
app.get("/services", async (req, res) => {
  const services = await prisma.service.findMany({ orderBy: { id: "asc" } });
  res.json(services);
});

// 2. All garages with their services
app.get("/garages", async (req, res) => {
  const garages = await prisma.garage.findMany({
    where: { isActive: true },
    include: { services: { include: { service: true } } },
    orderBy: { id: "asc" },
  });

  res.json(
    garages.map((g) => ({
      id: g.id,
      name: g.name,
      address: g.address,
      lat: g.lat,
      lng: g.lng,
      serviceRadiusKm: g.serviceRadiusKm,
      services: formatServices(g.services),
    }))
  );
});

// 3. Garages that serve a given location
app.get("/garages/nearby", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const serviceId = req.query.serviceId ? parseInt(req.query.serviceId) : null;

  // Validate input
  if (isNaN(lat) || lat < -90 || lat > 90) {
    return res.status(400).json({ error: "lat is required and must be between -90 and 90" });
  }
  if (isNaN(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ error: "lng is required and must be between -180 and 180" });
  }
  if (req.query.serviceId && isNaN(serviceId)) {
    return res.status(400).json({ error: "serviceId must be a number" });
  }

  // Get every active garage, with only the services we care about
  const garages = await prisma.garage.findMany({
    where: { isActive: true },
    include: {
      services: {
        where: { isAvailable: true, ...(serviceId && { serviceId }) },
        include: { service: true },
      },
    },
  });

  const results = garages
    .map((g) => ({ ...g, distanceKm: distanceKm(lat, lng, g.lat, g.lng) }))
    .filter((g) => g.distanceKm <= g.serviceRadiusKm) // garage covers this location
    .filter((g) => g.services.length > 0)              // and offers the requested service
    .sort((a, b) => a.distanceKm - b.distanceKm)       // closest first
    .map((g) => ({
      id: g.id,
      name: g.name,
      address: g.address,
      distanceKm: Number(g.distanceKm.toFixed(2)),
      serviceRadiusKm: g.serviceRadiusKm,
      services: formatServices(g.services),
    }));

  res.json({
    location: { lat, lng },
    serviceId,
    totalGarages: results.length,
    garages: results,
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

const PORT = process.env.PORT || 3000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
