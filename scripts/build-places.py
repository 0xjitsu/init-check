"""Build public/data/places.json from the GeoNames PH dump (CC BY 4.0).
Usage: python3 -I scripts/build-places.py PH.zip
"""
import json
import sys
import zipfile

REGION = {
    "01": "Ilocos", "02": "Cagayan Valley", "03": "Central Luzon", "05": "Bicol",
    "06": "Western Visayas", "07": "Central Visayas", "08": "Eastern Visayas",
    "09": "Zamboanga Peninsula", "10": "Northern Mindanao", "11": "Davao",
    "12": "SOCCSKSARGEN", "13": "Caraga", "14": "BARMM", "15": "CAR",
    "40": "CALABARZON", "41": "MIMAROPA", "NCR": "Metro Manila",
}
KEEP = {"PPLC", "PPLA", "PPLA2", "PPLA3", "PPLA4"}
# Metro Manila cities that GeoNames lists only as plain populated places.
EXTRA = [
    ("Makati", 14.5547, 121.0244, "NCR"), ("Pasig", 14.5764, 121.0851, "NCR"),
    ("Mandaluyong", 14.5794, 121.0359, "NCR"), ("Marikina", 14.6507, 121.1029, "NCR"),
    ("Pasay", 14.5378, 121.0014, "NCR"), ("Parañaque", 14.4793, 121.0198, "NCR"),
    ("Las Piñas", 14.4445, 120.9939, "NCR"), ("Muntinlupa", 14.4081, 121.0415, "NCR"),
    ("San Juan", 14.6019, 121.0355, "NCR"), ("Caloocan", 14.6488, 120.9830, "NCR"),
    ("Valenzuela", 14.7011, 120.9830, "NCR"), ("Malabon", 14.6625, 120.9567, "NCR"),
    ("Navotas", 14.6667, 120.9417, "NCR"), ("Pateros", 14.5446, 121.0686, "NCR"),
]

rows, seen = [], set()


def add(name, lat, lon, adm):
    key = (name.lower(), REGION.get(adm, ""))
    if key in seen:
        return
    seen.add(key)
    rows.append([name, round(float(lat), 4), round(float(lon), 4), REGION.get(adm, "")])


text = zipfile.ZipFile(sys.argv[1]).read("PH.txt").decode()
for line in text.split("\n"):
    f = line.split("\t")
    if len(f) > 10 and f[6] == "P" and f[7] in KEEP:
        add(f[2] or f[1], f[4], f[5], f[10])
for e in EXTRA:
    add(*e)
rows.sort(key=lambda r: r[0])
with open("public/data/places.json", "w", encoding="utf8") as out:
    json.dump(rows, out, ensure_ascii=False, separators=(",", ":"))
print(len(rows), "places")
