import { prisma } from "../src/lib/prisma.js";

const garages = [
  { name: "CP Auto Care",              address: "Connaught Place, New Delhi", lat: 28.6315, lng: 77.2167, serviceRadiusKm: 8 },
  { name: "Karol Bagh Motor Works",    address: "Karol Bagh, New Delhi",      lat: 28.6519, lng: 77.1909, serviceRadiusKm: 7 },
  { name: "Chandni Chowk Garage",      address: "Chandni Chowk, Delhi",       lat: 28.6506, lng: 77.2303, serviceRadiusKm: 5 },
  { name: "Lajpat Nagar Car Clinic",   address: "Lajpat Nagar, New Delhi",    lat: 28.5677, lng: 77.2433, serviceRadiusKm: 7 },
  { name: "Saket Wheels",              address: "Saket, New Delhi",           lat: 28.5245, lng: 77.2066, serviceRadiusKm: 8 },
  { name: "Hauz Khas Service Point",   address: "Hauz Khas, New Delhi",       lat: 28.5494, lng: 77.2001, serviceRadiusKm: 6 },
  { name: "Vasant Kunj Motors",        address: "Vasant Kunj, New Delhi",     lat: 28.5200, lng: 77.1590, serviceRadiusKm: 9 },
  { name: "Dwarka Auto Hub",           address: "Dwarka, New Delhi",          lat: 28.5921, lng: 77.0460, serviceRadiusKm: 12 },
  { name: "Janakpuri Car Care",        address: "Janakpuri, New Delhi",       lat: 28.6219, lng: 77.0878, serviceRadiusKm: 7 },
  { name: "Rajouri Speed Garage",      address: "Rajouri Garden, New Delhi",  lat: 28.6415, lng: 77.1209, serviceRadiusKm: 6 },
  { name: "Punjabi Bagh Motor Point",  address: "Punjabi Bagh, New Delhi",    lat: 28.6683, lng: 77.1316, serviceRadiusKm: 6 },
  { name: "Pitampura Autos",           address: "Pitampura, Delhi",           lat: 28.7034, lng: 77.1325, serviceRadiusKm: 7 },
  { name: "Rohini Car Clinic",         address: "Rohini, Delhi",              lat: 28.7366, lng: 77.1132, serviceRadiusKm: 10 },
  { name: "Model Town Garage",         address: "Model Town, Delhi",          lat: 28.7158, lng: 77.1910, serviceRadiusKm: 5 },
  { name: "Mayur Vihar Motor Works",   address: "Mayur Vihar, Delhi",         lat: 28.6077, lng: 77.2938, serviceRadiusKm: 8 },
  { name: "Laxmi Nagar Auto Care",     address: "Laxmi Nagar, Delhi",         lat: 28.6304, lng: 77.2773, serviceRadiusKm: 6 },
  { name: "Preet Vihar Car Point",     address: "Preet Vihar, Delhi",         lat: 28.6417, lng: 77.2953, serviceRadiusKm: 5 },
  { name: "Shahdara Wheels",           address: "Shahdara, Delhi",            lat: 28.6735, lng: 77.2895, serviceRadiusKm: 9 },
  { name: "Nehru Place Premium Motors",address: "Nehru Place, New Delhi",     lat: 28.5491, lng: 77.2533, serviceRadiusKm: 10 },
  { name: "GK Service Hub",            address: "Greater Kailash, New Delhi", lat: 28.5482, lng: 77.2380, serviceRadiusKm: 7 },
];

// Demo offerings; prices and durations are sample data.
const offerings = [
  { name: "Oil Change", category: "Maintenance", durationMinutes: 45, price: 1500 },
  { name: "Car Wash", category: "Cleaning", durationMinutes: 30, price: 500 },
  { name: "Tyre Repair", category: "Repair", durationMinutes: 30, price: 300 },
];

async function main() {
  await prisma.$transaction(async (tx) => {
    const services = [];
    for (const { name, category, ...details } of offerings) {
      const service = await tx.service.upsert({
        where: { name },
        update: {},
        create: { name, category },
      });
      services.push({ service, details });
    }

    for (const data of garages) {
      // Reuse the same demo garage on subsequent seed runs.
      const existing = await tx.garage.findFirst({
        where: { name: data.name, lat: data.lat, lng: data.lng },
      });
      const garage = existing ?? await tx.garage.create({ data });
      for (const { service, details } of services) {
        await tx.garageService.upsert({
          where: { garageId_serviceId: { garageId: garage.id, serviceId: service.id } },
          update: {},
          create: { garageId: garage.id, serviceId: service.id, ...details },
        });
      }
    }
  }, { timeout: 60000 });
  console.log(`Seeded ${garages.length} demo garages with ${offerings.length} services each.`);
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
