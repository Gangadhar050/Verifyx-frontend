// Lightweight offline PIN code lookup dataset used for the address auto-suggest
// (Prefix search — typing "56" suggests every code starting with 56, e.g. 560078).
// This is a representative dataset (not the full India Post database) so the
// candidate onboarding form can suggest PIN codes without calling a paid API.
export const PINCODE_DATA = [
  { pincode: "560034", area: "Koramangala", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560038", area: "Indiranagar", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560066", area: "Whitefield", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560100", area: "Electronic City", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560102", area: "HSR Layout", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560037", area: "Marathahalli", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560041", area: "Jayanagar", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560064", area: "Yelahanka", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560003", area: "Malleshwaram", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560010", area: "Rajajinagar", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560068", area: "BTM Layout", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560070", area: "Banashankari", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560024", area: "Hebbal", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560001", area: "MG Road", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560004", area: "Basavanagudi", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560078", area: "JP Nagar", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560076", area: "Bannerghatta Road", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560068", area: "Bommanahalli", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560035", area: "Sarjapur Road", city: "Bengaluru", state: "Karnataka" },
  { pincode: "560036", area: "KR Puram", city: "Bengaluru", state: "Karnataka" },
  { pincode: "110001", area: "Connaught Place", city: "New Delhi", state: "Delhi" },
  { pincode: "110005", area: "Karol Bagh", city: "New Delhi", state: "Delhi" },
  { pincode: "110075", area: "Dwarka", city: "New Delhi", state: "Delhi" },
  { pincode: "400058", area: "Andheri West", city: "Mumbai", state: "Maharashtra" },
  { pincode: "400050", area: "Bandra West", city: "Mumbai", state: "Maharashtra" },
  { pincode: "400076", area: "Powai", city: "Mumbai", state: "Maharashtra" },
  { pincode: "400092", area: "Borivali West", city: "Mumbai", state: "Maharashtra" },
  { pincode: "600017", area: "T Nagar", city: "Chennai", state: "Tamil Nadu" },
  { pincode: "600020", area: "Adyar", city: "Chennai", state: "Tamil Nadu" },
  { pincode: "600040", area: "Anna Nagar", city: "Chennai", state: "Tamil Nadu" },
  { pincode: "500034", area: "Banjara Hills", city: "Hyderabad", state: "Telangana" },
  { pincode: "500032", area: "Gachibowli", city: "Hyderabad", state: "Telangana" },
  { pincode: "500081", area: "Madhapur", city: "Hyderabad", state: "Telangana" },
  { pincode: "700064", area: "Salt Lake", city: "Kolkata", state: "West Bengal" },
  { pincode: "700016", area: "Park Street", city: "Kolkata", state: "West Bengal" },
  { pincode: "411038", area: "Kothrud", city: "Pune", state: "Maharashtra" },
  { pincode: "411057", area: "Hinjewadi", city: "Pune", state: "Maharashtra" },
  { pincode: "411014", area: "Viman Nagar", city: "Pune", state: "Maharashtra" },
  { pincode: "380009", area: "Navrangpura", city: "Ahmedabad", state: "Gujarat" },
  { pincode: "380015", area: "Satellite", city: "Ahmedabad", state: "Gujarat" },
  { pincode: "302021", area: "Vaishali Nagar", city: "Jaipur", state: "Rajasthan" },
  { pincode: "226010", area: "Gomti Nagar", city: "Lucknow", state: "Uttar Pradesh" },
  { pincode: "201309", area: "Sector 62", city: "Noida", state: "Uttar Pradesh" },
  { pincode: "160017", area: "Sector 17", city: "Chandigarh", state: "Chandigarh" },
  { pincode: "682030", area: "Kakkanad", city: "Kochi", state: "Kerala" },
  { pincode: "751024", area: "Patia", city: "Bhubaneswar", state: "Odisha" },
  { pincode: "800001", area: "Boring Road", city: "Patna", state: "Bihar" },
  { pincode: "440001", area: "Civil Lines", city: "Nagpur", state: "Maharashtra" },
  { pincode: "390007", area: "Alkapuri", city: "Vadodara", state: "Gujarat" },
  { pincode: "110027", area: "Rajouri Garden", city: "New Delhi", state: "Delhi" },
  { pincode: "122001", area: "Sector 15", city: "Gurugram", state: "Haryana" },
  { pincode: "201012", area: "Vasundhara", city: "Ghaziabad", state: "Uttar Pradesh" },
];

// Returns up to `limit` matches whose PIN code starts with the given digits.
export function searchPincodes(prefix, limit = 8) {
  const clean = String(prefix || '').replace(/\D/g, '');
  if (clean.length < 2) return [];
  return PINCODE_DATA.filter((row) => row.pincode.startsWith(clean)).slice(0, limit);
}

// Exact PIN code lookup (used to auto-fill city/state once all 6 digits are entered).
export function lookupPincode(pincode) {
  const clean = String(pincode || '').replace(/\D/g, '');
  return PINCODE_DATA.find((row) => row.pincode === clean) || null;
}
