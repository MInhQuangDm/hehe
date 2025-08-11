import React, { useState } from "react";
import Papa from "papaparse";
import { saveAs } from "file-saver";

// === Utilities ===

function FirebaseSafeKey(key) {
  return key.replace(/\./g, "_");
}

function getHPFormat(str) {
  let v = 0;
  str = str?.toLowerCase().replace("hp", "").trim();
  const isM = str.includes("m");
  const isK = str.includes("k");
  str = str.replace("m", "").replace("k", "");

  try {
    v = parseFloat(str);
    if (isK) v *= 1_000;
    if (isM) v *= 1_000_000;
  } catch {
    v = 0;
  }

  return v;
}

function convertCSVRowToEnemyEntry(row) {
  const key = row[0]?.trim();
  const rate = parseFloat(row[1]);
  if (!key || isNaN(rate)) return null;
  return { key, rate };
}

function convertCSVRowToBossEntries(row, includeDamage = false) {
  try {
    // Ensure row is long enough
    if (row.length < 11) return null;

    row = row.map((cell) => cell?.trim());

    const miniBoss = {
      id: FirebaseSafeKey(row[2]),
      key: row[0],
      scale: parseFloat(row[3]),
      hp: getHPFormat(row[4]),
    };

    const boss = {
      id: FirebaseSafeKey(row[7]),
      key: row[0],
      scale: parseFloat(row[8]),
      hp: getHPFormat(row[9]),
    };

    if (includeDamage) {
      miniBoss.damage = getHPFormat(row[5]);
      boss.damage = getHPFormat(row[10]);
    }

    return { miniBoss, boss };
  } catch (err) {
    console.error("Failed to parse row:", row, err);
    return null;
  }
}

export default function CreepRateExporter() {
  const [enemyAndroidUrl, setEnemyAndroidUrl] = useState(
    "https://docs.google.com/spreadsheets/d/1Vb0cXO0iBg3TKVSMdUko7v79VVInlkkn0_KklBeAyns/export?format=csv&gid=248018394"
  );
  const [bossAndroidUrl, setBossAndroidUrl] = useState(
    "https://docs.google.com/spreadsheets/d/1Vb0cXO0iBg3TKVSMdUko7v79VVInlkkn0_KklBeAyns/export?format=csv&gid=629366882"
  );
  const [enemyIOSUrl, setEnemyIOSUrl] = useState(
    "https://docs.google.com/spreadsheets/d/1Vb0cXO0iBg3TKVSMdUko7v79VVInlkkn0_KklBeAyns/export?gid=1517702799#gid=1517702799"
  );
  const [bossIOSUrl, setBossIOSUrl] = useState(
    "https://docs.google.com/spreadsheets/d/1Vb0cXO0iBg3TKVSMdUko7v79VVInlkkn0_KklBeAyns/export?gid=1951691228#gid=1951691228"
  );
  const [loading, setLoading] = useState(false);

  const handleExport = async (includeDamage = false) => {
    setLoading(true);
    handleExportPlatform(enemyAndroidUrl,bossAndroidUrl,`rate_android`, includeDamage);
    handleExportPlatform(enemyIOSUrl,bossIOSUrl,`rate_ios`, includeDamage);
    setLoading(false);
  };
  const handleExportPlatform = async (enemyUrl,bossUrl,fileName, includeDamage = false) => {
    const enemyList = [];
    const bossList = [];
    const minibossList = [];

    try {
      const enemyText = await fetch(enemyUrl).then((res) => res.text());
      const enemyRows = Papa.parse(enemyText).data;

      for (let i = 1; i < enemyRows.length; i++) {
        if (enemyRows[i].filter(Boolean).length === 0) continue; // skip empty rows
        const entry = convertCSVRowToEnemyEntry(enemyRows[i]);
        if (entry) enemyList.push(entry);
      }

      const bossText = await fetch(bossUrl).then((res) => res.text());
      const bossRows = Papa.parse(bossText).data;

      for (let i = 1; i < bossRows.length; i++) {
        if (bossRows[i].filter(Boolean).length === 0) continue; // skip empty rows
        const parsed = convertCSVRowToBossEntries(bossRows[i], includeDamage);
        if (parsed) {
          bossList.push(parsed.boss);
          minibossList.push(parsed.miniBoss);
        }
      }

      const sheetRateList = {
        enemyList,
        bossList,
        minibossList,
      };

      const fileName2 = includeDamage
        ? `${fileName}_with_damage.json`
        : `${fileName}.json`;
      const blob = new Blob([JSON.stringify(sheetRateList, null, 2)], {
        type: "application/json",
      });
      saveAs(blob, fileName2);
    } catch (err) {
      console.error("Export failed", err);
      alert("Something went wrong while exporting.");
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "Arial" }}>
      <h2>Export creep_rate.json</h2>

      <div style={{ marginBottom: "1rem" }}>
        <label>Enemy ANDROID CSV URL:</label>
        <br />
        <input
          type="text"
          value={enemyAndroidUrl}
          onChange={(e) => setEnemyAndroidUrl(e.target.value)}
          style={{ width: "100%", padding: "8px" }}
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label>Boss + Miniboss ANDROID CSV URL:</label>
        <br />
        <input
          type="text"
          value={bossAndroidUrl}
          onChange={(e) => setBossAndroidUrl(e.target.value)}
          style={{ width: "100%", padding: "8px" }}
        />
      </div>

      <br />
      <div style={{ marginBottom: "1rem" }}>
        <label>Enemy IOS CSV URL:</label>
        <br />
        <input
          type="text"
          value={enemyIOSUrl}
          onChange={(e) => setEnemyIOSUrl(e.target.value)}
          style={{ width: "100%", padding: "8px" }}
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label>Boss + Miniboss IOS CSV URL:</label>
        <br />
        <input
          type="text"
          value={bossIOSUrl}
          onChange={(e) => setBossIOSUrl(e.target.value)}
          style={{ width: "100%", padding: "8px" }}
        />
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => handleExport(false)}
          disabled={loading}
          style={{ padding: "10px 20px" }}
        >
          {loading ? "Exporting..." : "Old Export (no damage)"}
        </button>
        <button
          onClick={() => handleExport(true)}
          disabled={loading}
          style={{ padding: "10px 20px" }}
        >
          {loading ? "Exporting..." : "New Export (with damage)"}
        </button>
      </div>
    </div>
  );
}
