const FFXIV_DATA = {
  jobs: [
    { id: "PLD", name: "ナイト", icon: "Paladin.png" },
    { id: "WAR", name: "戦士", icon: "Warrior.png" },
    { id: "DRK", name: "暗黒騎士", icon: "DarkKnight.png" },
    { id: "GNB", name: "ガンブレイカー", icon: "Gunbreaker.png" },
    { id: "WHM", name: "白魔道士", icon: "WhiteMage.png" },
    { id: "SCH", name: "学者", icon: "Scholar.png" },
    { id: "AST", name: "占星術師", icon: "Astrologian.png" },
    { id: "SGE", name: "賢者", icon: "Sage.png" },
    { id: "MNK", name: "モンク", icon: "Monk.png" },
    { id: "DRG", name: "竜騎士", icon: "Dragoon.png" },
    { id: "NIN", name: "忍者", icon: "Ninja.png" },
    { id: "SAM", name: "侍", icon: "Samurai.png" },
    { id: "RPR", name: "リーパー", icon: "Reaper.png" },
    { id: "VPR", name: "ヴァイパー", icon: "Viper.png" },
    { id: "BRD", name: "吟遊詩人", icon: "Bard.png" },
    { id: "MCH", name: "機工士", icon: "Machinist.png" },
    { id: "DNC", name: "踊り子", icon: "Dancer.png" },
    { id: "BLM", name: "黒魔道士", icon: "BlackMage.png" },
    { id: "SMN", name: "召喚士", icon: "Summoner.png" },
    { id: "RDM", name: "赤魔道士", icon: "RedMage.png" },
    { id: "PCT", name: "ピクトマンサー", icon: "Pictomancer.png" }
  ],
  maps: [
    "シールロック",
    "フィールド・オブ・グローリー",
    "オンサル・ハカイル",
    "外縁遺跡群",
    "ウォーコー・チーテ（演習戦）"
  ],
  grandCompanies: ["黒渦団", "双蛇党", "不滅隊"]
};

const SAMPLE_MATCHES = [
  ["2026-06-21","オンサル・ハカイル","黒渦団",1,"DRK",8,2,21,1432000,681000,92000,true],
  ["2026-06-22","シールロック","双蛇党",2,"DRG",5,4,18,1094000,544000,30000,false],
  ["2026-06-23","外縁遺跡群","不滅隊",3,"MCH",3,5,16,942000,489000,18000,false],
  ["2026-06-24","ウォーコー・チーテ（演習戦）","黒渦団",1,"DRK",10,1,24,1588000,720000,104000,true],
  ["2026-06-25","オンサル・ハカイル","黒渦団",1,"RPR",7,3,20,1321000,623000,42000,false],
  ["2026-06-26","シールロック","双蛇党",2,"AST",2,3,28,604000,398000,742000,false],
  ["2026-06-27","外縁遺跡群","不滅隊",1,"DRK",9,2,22,1490000,695000,86000,true],
  ["2026-06-28","フィールド・オブ・グローリー","黒渦団",3,"SAM",6,5,14,1186000,502000,21000,false],
  ["2026-06-29","オンサル・ハカイル","双蛇党",2,"BLM",5,4,17,1274000,421000,36000,false],
  ["2026-06-30","シールロック","黒渦団",1,"DRK",11,2,25,1662000,734000,97000,true],
  ["2026-07-01","外縁遺跡群","不滅隊",2,"WAR",4,3,19,884000,840000,118000,false],
  ["2026-07-02","オンサル・ハカイル","黒渦団",1,"DRK",12,1,27,1724000,701000,111000,true],
  ["2026-07-03","シールロック","双蛇党",3,"PCT",4,6,15,1219000,390000,26000,false],
  ["2026-07-04","ウォーコー・チーテ（演習戦）","不滅隊",1,"DRG",8,2,22,1398000,574000,31000,false],
  ["2026-07-05","シールロック","黒渦団",2,"MNK",6,3,19,1254000,612000,22000,false]
].map((row, index) => ({
  id: crypto.randomUUID ? crypto.randomUUID() : `sample-${index}`,
  date: row[0],
  map: row[1],
  grandCompany: row[2],
  rank: row[3],
  job: row[4],
  kills: row[5],
  deaths: row[6],
  assists: row[7],
  damage: row[8],
  damageTaken: row[9],
  healing: row[10],
  topDamage: row[11]
}));
