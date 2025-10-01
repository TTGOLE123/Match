const app = document.getElementById("app");

// --- LocalStorage ---
function saveState(state){ localStorage.setItem("cornholeState", JSON.stringify(state)); }
function loadState(){ return JSON.parse(localStorage.getItem("cornholeState")||"null"); }

// --- Initial State ---
let state = loadState() || { players: {}, gameDays: [] };

// --- Utilities ---
function uid(){ return Math.random().toString(36).substr(2,9); }

// --- Spielerverwaltung ---
function addPlayer(name){
  if(!name || Object.keys(state.players).length>=50) return;
  if(!state.players[name]){
    state.players[name] = { games:0, wins:0, points:0, rounds:[], averagePerSack:0, opponentPoints:0, gameDays:[] };
  }
}

// --- Spieltage ---
function addGameDay(){
  const name = prompt("Name des Spieltags:", `Spieltag ${state.gameDays.length+1}`);
  if(!name) return;
  state.gameDays.push({ id: uid(), name, matches: [] });
  render();
}

// --- Match erstellen in Spieltag ---
function addMatchToGameDay(gameDayId, type="1v1"){
  const day = state.gameDays.find(gd=>gd.id===gameDayId);
  if(!day) return;
  const match = { id: uid(), type, teams: [], finished: false };
  day.matches.push(match);
  render();
}

// --- Spieler auswählen für Match ---
function selectPlayers(gameDayId, matchId){
  const day = state.gameDays.find(gd=>gd.id===gameDayId);
  const match = day.matches.find(m=>m.id===matchId);
  if(!match || match.teams.length>0) return;

  const maxPlayers = match.type==="1v1"?1:2;
  let teamA = prompt(`Team A: Wähle ${maxPlayers} Spieler durch Komma getrennt oder neuen Namen eingeben`);
  let teamB = prompt(`Team B: Wähle ${maxPlayers} Spieler durch Komma getrennt oder neuen Namen eingeben`);

  teamA = teamA.split(",").map(s=>s.trim()).filter(s=>s).slice(0,maxPlayers);
  teamB = teamB.split(",").map(s=>s.trim()).filter(s=>s).slice(0,maxPlayers);

  teamA.forEach(p=>{
    addPlayer(p);
    if(!state.players[p].gameDays.includes(gameDayId)) state.players[p].gameDays.push(gameDayId);
  });
  teamB.forEach(p=>{
    addPlayer(p);
    if(!state.players[p].gameDays.includes(gameDayId)) state.players[p].gameDays.push(gameDayId);
  });

  match.teams = [
    { players: teamA, rounds: [], totalScore:0 },
    { players: teamB, rounds: [], totalScore:0 }
  ];
  render();
}

// --- Runde hinzufügen ---
function addRound(gameDayId, matchId){
  const day = state.gameDays.find(gd=>gd.id===gameDayId);
  const match = day.matches.find(m=>m.id===matchId);
  if(!match || match.finished) return;

  const roundScores = [[],[]]; // Team 0, Team 1
  match.teams.forEach((team, tIdx)=>{
    const teamRound = [];
    team.players.forEach(p=>{
      let s = prompt(`Punkte für ${p} in dieser Runde (4 Säcke, Komma getrennt, z.B. 0,1,3,1)`,"0,0,0,0");
      const arr = s.split(",").map(n=>parseInt(n)||0).slice(0,4);
      teamRound.push(arr);
      state.players[p].rounds.push(arr);
    });
    roundScores[tIdx] = teamRound;
    const totalTeamRound = teamRound.flat().reduce((a,b)=>a+b,0);
    team.rounds.push(teamRound);
    team.totalScore += totalTeamRound;
  });

  // Gegnerpunkte berechnen
  match.teams.forEach((team, tIdx)=>{
    const oppIdx = tIdx===0?1:0;
    team.players.forEach((p, pi)=>{
      const oppPoints = roundScores[oppIdx].flat().reduce((a,b)=>a+b,0);
      state.players[p].opponentPoints += oppPoints;
    });
  });

  render();
}

// --- Match beenden ---
function finishMatch(gameDayId, matchId){
  const day = state.gameDays.find(gd=>gd.id===gameDayId);
  const match = day.matches.find(m=>m.id===matchId);
  if(!match || match.finished) return;

  match.finished = true;
  const winnerIdx = match.teams[0].totalScore>match.teams[1].totalScore?0:1;

  match.teams.forEach((team, tIdx)=>{
    team.players.forEach(p=>{
      state.players[p].games++;
      state.players[p].points += team.totalScore;
      if(tIdx===winnerIdx) state.players[p].wins++;
      const allSacks = state.players[p].rounds.flat();
      state.players[p].averagePerSack = allSacks.reduce((a,b)=>a+b,0)/allSacks.length;
    });
  });

  render();
}

// --- Leaderboard global ---
function leaderboard(){
  const players = Object.entries(state.players).map(([name,stats])=>({name,...stats}));
  players.sort((a,b)=>{
    if(b.wins!==a.wins) return b.wins-a.wins;
    if(b.points!==a.points) return b.points-a.points;
    return b.averagePerSack - a.averagePerSack;
  });
  return players;
}

// --- Leaderboard für Spieltag ---
function leaderboardByGameDay(gameDayId){
  const day = state.gameDays.find(gd=>gd.id===gameDayId);
  if(!day) return [];
  const playerMap = {};
  day.matches.forEach(m=>{
    if(!m.finished) return;
    m.teams.forEach((team, tIdx)=>{
      team.players.forEach(p=>{
        if(!playerMap[p]) playerMap[p] = {name:p, games:0, wins:0, points:0};
        playerMap[p].games++;
        playerMap[p].points += team.totalScore;
        const winnerIdx = m.teams[0].totalScore>m.teams[1].totalScore?0:1;
        if(tIdx===winnerIdx) playerMap[p].wins++;
      });
    });
  });
  const players = Object.values(playerMap);
  players.sort((a,b)=>{
    if(b.wins!==a.wins) return b.wins-a.wins;
    if(b.points!==a.points) return b.points-a.points;
    return 0;
  });
  return players;
}

// --- Spielerstatistik anzeigen ---
function renderPlayerStats(playerName){
  const p = state.players[playerName];
  if(!p) return alert("Spieler nicht gefunden");
  const div = document.createElement("div");
  div.className="card";
  div.innerHTML = `<h3>Statistik: ${playerName}</h3>
    <p>Spieltage: ${p.gameDays.length}</p>
    <p>Durchschnitt pro Sack: ${p.averagePerSack.toFixed(2)}</p>
    <p>Punkte gesamt: ${p.points}</p>
    <p>Punkte von Gegnern: ${p.opponentPoints}</p>
    <p>Spiele gewonnen: ${p.wins}</p>
    <p>Spiele verloren: ${p.games - p.wins}</p>`;
  app.appendChild(div);
}

// --- Render ---
function render(){
  saveState(state);
  app.innerHTML="";

  // --- Controls ---
  const ctrlDiv = document.createElement("div");
  ctrlDiv.innerHTML=`
    <button class="btn" onclick="addGameDay()">+ Neuen Spieltag erstellen</button>
    <button class="btn" onclick="renderGlobalLeaderboard()">Globales Leaderboard</button>
    <button class="btn" onclick="renderPlayerList()">Spielerliste anzeigen</button>
  `;
  app.appendChild(ctrlDiv);

  // --- Spieltage ---
  state.gameDays.forEach(day=>{
    const div = document.createElement("div");
    div.className="card";
    div.innerHTML = `<h2>${day.name}</h2>`;
    const addMatchBtn = document.createElement("button");
    addMatchBtn.className="btn";
    addMatchBtn.textContent="+ Match hinzufügen";
    addMatchBtn.onclick=()=>addMatchToGameDay(day.id,"1v1");
    div.appendChild(addMatchBtn);

    day.matches.forEach(m=>{
      const matchDiv = document.createElement("div");
      matchDiv.innerHTML=`<b>Match ${m.id}</b> ${m.finished?"(Beendet)":""}`;
      if(m.teams.length===0 && !m.finished){
        const selBtn = document.createElement("button");
        selBtn.className="btn";
        selBtn.textContent="Spieler wählen";
        selBtn.onclick=()=>selectPlayers(day.id,m.id);
        matchDiv.appendChild(selBtn);
      } else {
        m.teams.forEach((team,idx)=>{
          matchDiv.innerHTML+=`<div><b>${team.players.join(", ")}</b>: ${team.totalScore}</div>`;
        });
        if(!m.finished){
          const roundBtn = document.createElement("button");
          roundBtn.className="btn";
          roundBtn.textContent="Neue Runde hinzufügen";
          roundBtn.onclick=()=>addRound(day.id,m.id);
          matchDiv.appendChild(roundBtn);

          const finBtn = document.createElement("button");
          finBtn.className="btn-danger";
          finBtn.textContent="Match beenden";
          finBtn.onclick=()=>finishMatch(day.id,m.id);
          matchDiv.appendChild(finBtn);
        }
      }
      div.appendChild(matchDiv);
    });

    const lbBtn = document.createElement("button");
    lbBtn.className="btn";
    lbBtn.textContent="Leaderboard Spieltag";
    lbBtn.onclick=()=>renderLeaderboardByGameDay(day.id);
    div.appendChild(lbBtn);

    app.appendChild(div);
  });
}

// --- Render global leaderboard ---
function renderGlobalLeaderboard(){
  const div = document.createElement("div");
  div.className="card";
  div.innerHTML="<h3>Globales Leaderboard</h3>";
  const table = document.createElement("table");
  table.innerHTML="<tr><th>Spieler</th><th>Spiele</th><th>Siege</th><th>Punkte</th><th>Avg/Sack</th></tr>";
  leaderboard().forEach(p=>{
    const row = document.createElement("tr");
    row.innerHTML=`<td>${p.name}</td><td>${p.games}</td><td>${p.wins}</td><td>${p.points}</td><td>${p.averagePerSack.toFixed(2)}</td>`;
    table.appendChild(row);
  });
  div.appendChild(table);
  app.appendChild(div);
}

// --- Render leaderboard Spieltag ---
function renderLeaderboardByGameDay(gameDayId){
  const div = document.createElement("div");
  div.className="card";
  div.innerHTML=`<h3>Leaderboard Spieltag</h3>`;
  const table = document.createElement("table");
  table.innerHTML="<tr><th>Spieler</th><th>Spiele</th><th>Siege</th><th>Punkte</th></tr>";
  leaderboardByGameDay(gameDayId).forEach(p=>{
    const row = document.createElement("tr");
    row.innerHTML=`<td>${p.name}</td><td>${p.games}</td><td>${p.wins}</td><td>${p.points}</td>`;
    table.appendChild(row);
  });
  div.appendChild(table);
  app.appendChild(div);
}

// --- Spielerliste ---
function renderPlayerList(){
  const div = document.createElement("div");
  div.className="card";
  div.innerHTML="<h3>Spielerliste</h3>";
  Object.keys(state.players).forEach(p=>{
    const btn = document.createElement("button");
    btn.textContent=p;
    btn.className="btn";
    btn.onclick=()=>renderPlayerStats(p);
    div.appendChild(btn);
  });
  app.appendChild(div);
}

render();
