import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { createAuth } from "../config/auth.js";
import { Artwork, Comment, Transaction, User } from "../models/index.js";

const images = [
  "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1577720580479-7d839d829c73?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1579783901586-d88db74b4fe4?auto=format&fit=crop&w=1200&q=80"
];

const { authDb } = await connectDatabase();
const auth = createAuth(authDb);

// Create a Better Auth credential record (email + hashed password).
// Skips silently if the email is already registered.
async function seedAuthUser(name, email, password) {
  try {
    await auth.api.signUpEmail({ body: { name, email, password } });
  } catch {
    // Already exists — safe to ignore
  }
}

await Promise.all([
  seedAuthUser("Admin User",      "admin@arthub.com",          "Admin@123"),
  seedAuthUser("Nira Chowdhury",  "nira.artist@example.com",   "Artist@123"),
  seedAuthUser("Ayan Karim",      "ayan.artist@example.com",   "Artist@123"),
  seedAuthUser("Maya Collector",  "maya@example.com",          "Buyer@123"),
  seedAuthUser("Rafi Hossain",    "rafi.collector@example.com","Buyer@123"),
]);

async function upsertUser(user) {
  return User.findOneAndUpdate(
    { email: user.email },
    { $setOnInsert: user },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function upsertArtwork(artwork) {
  const existing = await Artwork.findOne({
    title: artwork.title,
    artist: artwork.artist
  });

  if (existing) return existing;
  return Artwork.create(artwork);
}

const [admin, artistOne, artistTwo, buyer, buyerTwo] = await Promise.all([
  upsertUser({
    name: "Admin User",
    email: "admin@arthub.com",
    role: "admin",
    subscriptionTier: "premium"
  }),
  upsertUser({
    name: "Nira Chowdhury",
    email: "nira.artist@example.com",
    role: "artist",
    avatarUrl: "https://i.pravatar.cc/160?img=47"
  }),
  upsertUser({
    name: "Ayan Karim",
    email: "ayan.artist@example.com",
    role: "artist",
    avatarUrl: "https://i.pravatar.cc/160?img=12"
  }),
  upsertUser({
    name: "Maya Collector",
    email: "maya@example.com",
    role: "user",
    subscriptionTier: "free"
  }),
  upsertUser({
    name: "Rafi Hossain",
    email: "rafi.collector@example.com",
    role: "user",
    subscriptionTier: "pro"
  })
]);

const artworkInputs = [
  {
    title: "Rain Over Old Dhaka",
    description: "A warm city scene with evening rain, neon signs, and soft reflections.",
    price: 420,
    category: "Painting",
    imageUrl: images[0],
    artist: artistOne._id
  },
  {
    title: "Signal Garden",
    description: "Digital artwork mixing flowers, data streams, and cyberpunk color.",
    price: 250,
    category: "Digital",
    imageUrl: images[1],
    artist: artistTwo._id
  },
  {
    title: "Silent Terracotta",
    description: "A sculptural study inspired by handmade clay forms.",
    price: 780,
    category: "Sculpture",
    imageUrl: images[2],
    artist: artistOne._id
  },
  {
    title: "Blue River Memory",
    description: "Abstract layers of river blue and silver light.",
    price: 340,
    category: "Abstract",
    imageUrl: images[3],
    artist: artistTwo._id
  },
  {
    title: "Golden Window",
    description: "A modern interior piece with simple geometry and bold contrast.",
    price: 610,
    category: "Painting",
    imageUrl: images[4],
    artist: artistOne._id
  },
  {
    title: "Archive of Light",
    description: "A clean photographic composition for calm spaces.",
    price: 190,
    category: "Photography",
    imageUrl: images[5],
    artist: artistTwo._id
  },
  {
    title: "Monsoon Courtyard",
    description: "Muted green and clay colors inspired by quiet village courtyards after rain.",
    price: 520,
    category: "Mixed Media",
    imageUrl: "https://images.unsplash.com/photo-1582201942988-13e60e4556ee?auto=format&fit=crop&w=1200&q=80",
    artist: artistOne._id
  },
  {
    title: "Neon Rickshaw Map",
    description: "A bright digital map-style artwork based on city movement and street signs.",
    price: 300,
    category: "Digital",
    imageUrl: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=1200&q=80",
    artist: artistTwo._id
  }
];

const catalogImageUrls = [
  "https://images.unsplash.com/photo-1549887534-1541e9326642?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1574182245530-967d9b3831af?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1515405295579-ba7b45403062?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1545989253-02cc26577f88?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1580136579312-94651dfd596d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1579762593175-20226054cad0?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1604871000636-074fa5117945?auto=format&fit=crop&w=1200&q=80"
];

const extraTitles = [
  "Copper Evening Study",
  "Green Signal After Rain",
  "Charcoal River Lines",
  "Museum Corner Light",
  "Paper Boat Geometry",
  "Glass Market Reflection",
  "Terrace Before Sunset",
  "Data Bloom Field",
  "Clay Lamp Sequence",
  "North Window Silence",
  "Electric Monsoon Grid",
  "Soft Brass Horizon",
  "Bengal Archive Blue",
  "Folded Street Poster",
  "Cobalt Train Memory",
  "Ink Map of Gulshan",
  "Quiet Textile Pattern",
  "Digital Baul Rhythm",
  "Saffron Shadow Wall",
  "Concrete Garden Form",
  "Silver Lake Fragment",
  "Red Door Composition",
  "Pixel Rain Corridor",
  "Handmade Cloud Study",
  "Golden Hour Bazaar",
  "Stone and Signal",
  "Ceramic Dawn Object",
  "Metro Line Abstract",
  "Indigo Courtyard Air",
  "Festival Light Trace",
  "Minimal Clay Tower",
  "Monochrome Ferry Dock",
  "Urban Script Layer",
  "Late Night Canvas",
  "Woven Memory Block",
  "Sunlit Studio Shelf"
];

const categories = ["Painting", "Digital", "Sculpture", "Abstract", "Photography", "Mixed Media"];

extraTitles.forEach((title, index) => {
  const artist = index % 2 === 0 ? artistOne : artistTwo;
  const category = categories[index % categories.length];

  artworkInputs.push({
    title,
    description: `${title} is a ${category.toLowerCase()} artwork prepared as demo marketplace data for browsing, filtering, and pagination testing.`,
    price: 160 + ((index * 73) % 940),
    category,
    imageUrl: catalogImageUrls[index % catalogImageUrls.length],
    artist: artist._id
  });
});

const artworks = [];
for (const artworkInput of artworkInputs) {
  artworks.push(await upsertArtwork(artworkInput));
}

const purchaseArtwork = artworks[1];
const existingPurchase = await Transaction.findOne({
  type: "purchase",
  artwork: purchaseArtwork._id,
  buyer: buyer._id,
  status: "paid"
});

if (!existingPurchase) {
  await Transaction.create({
    type: "purchase",
    artwork: purchaseArtwork._id,
    buyer: buyer._id,
    artist: artistTwo._id,
    amount: purchaseArtwork.price,
    status: "paid"
  });

  purchaseArtwork.status = "sold";
  await purchaseArtwork.save();
}

const existingSubscription = await Transaction.findOne({
  type: "subscription",
  buyer: buyerTwo._id,
  subscriptionTier: "pro",
  status: "paid"
});

if (!existingSubscription) {
  await Transaction.create({
    type: "subscription",
    buyer: buyerTwo._id,
    subscriptionTier: "pro",
    amount: 9.99,
    status: "paid"
  });
}

const existingComment = await Comment.findOne({
  artwork: purchaseArtwork._id,
  user: buyer._id
});

if (!existingComment) {
  await Comment.create({
    artwork: purchaseArtwork._id,
    user: buyer._id,
    comment: "This piece has a strong mood. The colors feel modern but still warm."
  });
}

const counts = {
  users: await User.countDocuments(),
  artworks: await Artwork.countDocuments(),
  transactions: await Transaction.countDocuments(),
  comments: await Comment.countDocuments()
};

console.log("Seed complete.");
console.log(`Users: ${counts.users}`);
console.log(`Artworks: ${counts.artworks}`);
console.log(`Transactions: ${counts.transactions}`);
console.log(`Comments: ${counts.comments}`);
console.log("\n--- Login credentials ---");
console.log("Admin   : admin@arthub.com         / Admin@123");
console.log("Artist  : nira.artist@example.com  / Artist@123");
console.log("Artist  : ayan.artist@example.com  / Artist@123");
console.log("Buyer   : maya@example.com         / Buyer@123");
console.log("Buyer   : rafi.collector@example.com / Buyer@123");
await mongoose.disconnect();
process.exit(0);
