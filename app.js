const app = document.getElementById("app");

// --- LocalStorage ---
function saveState(state){ localStorage.setItem("cornholeState", JSON.stringify(state)); }
function loadState(){ return JSON.parse(localStorage.getItem("cornholeState")||"null"); }

// --- Initial State ---
let state = loadState() || { players: {}, gameDays: [] };

// --- Utilities ---
function uid(){ return Math.random().toString(36).substr(2,9); }

// --- Spieler ---
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

// --- Match erstellen ---
function addMatchToGameDay(gameDayId, type="1v1"){
  const day = state.gameDays.find(gd=>gd.id===gameDayId);
  if(!day) return;
  const matchNumber = day.matches.length + 1;
  const match = { id: uid(), number: matchNumber, type, teams: [], finished: false, pendingRounds:{} };
  day.matches.push(match);
  render();
}

// --- Spieler auswählen ---
function selectPlayers(gameDayId, matchId){
  const day = state.gameDays.find(gd=>gd.id===gameDayId);
  const match = day.matches.find(m=>m.id===matchId);
  if(!match || match.teams.length>0) return;

  const maxPlayers = match.type==="1v1"?1:2;
  let teamA = prompt(`Team A: Wähle ${maxPlayers} Spieler durch Komma getrennt oder neuen Namen eingeben`);
  let teamB = prompt(`Team B: Wähle ${maxPlayers} Spieler durch Komma getrennt oder neuen Namen eingeben`);

  teamA = teamA.split(",").map(s=>s.trim()).filter(s=>s).slice(0,maxPlayers);
  teamB = teamB.split(",").map(s=>s.trim()).filter(s=>s).slice(0,maxPlayers);

  teamA.forEach(p=>{ addPlayer(p); if(!state.players[p].gameDays.includes(gameDayId)) state.players[p].gameDays.push(gameDayId); });
  teamB.forEach(p=>{ addPlayer(p); if(!state.players[p].gameDays.includes(gameDayId)) state.players[p].gameDays.push(gameDayId); });

  match.teams = [
    { players: teamA, rounds: [], totalScore: 0 },
    { players: teamB, rounds: [], totalScore: 0 }
  ];

  render();
}

// --- Rundeingabe per Button ---
function addRoundUI(gameDayId, matchId){
  const day = state.gameDays.find(gd=>gd.id===gameDayId);
  const match = day.matches.find(m=>m.id===matchId);
  if(!match || match.finished) return;

  const roundDiv = document.createElement("div");
  roundDiv.className="card";
  roundDiv.innerHTML=`<h4>Neue Runde für Match ${match.number}</h4>`;

  match.teams.forEach((team,tIdx)=>{
    team.players.forEach(p=>{
      const playerDiv = document.createElement("div");
      playerDiv.innerHTML=`<b>${p}</b> `;
      const playerRound = [];

      for(let i=0;i<4;i++){
        const sackDiv = document.createElement("span");
        sackDiv.style.marginRight="5px";
        [0,1,3].forEach(points=>{
          const btn = document.createElement("button");
          btn.textContent=points;
          btn.className="btn";
          btn.onclick=()=>{
            playerRound[i]=points;
            sackDiv.innerHTML=`Sack ${i+1}: ${playerRound[i]} `;
            [0,1,3].forEach(p2=>{
              if(p2!==points){
                const b = sackDiv.querySelectorAll("button");
                b.forEach(bu=>{ if(bu.textContent==p2) bu.disabled=false; });
              }
            });
            btn.disabled=true;
          };
          sackDiv.appendChild(btn);
        });
        playerDiv.appendChild(sackDiv);
      }

      const finishBtn = document.createElement("button");
      finishBtn.textContent="Runde abschließen";
      finishBtn.className="btn btn-danger";
      finishBtn.onclick=()=>{
        if(playerRound.length<4 || playerRound.some(v=>v===undefined)){
          alert("Bitte alle 4 Säcke wählen!");
          return;
        }
        if(!match.pendingRounds[tIdx]) match.pendingRounds[tIdx]={};
        match.pendingRounds[tIdx][p] = playerRound;
        alert(`Runde für ${p} gespeichert!`);
      };

      playerDiv.appendChild(finishBtn);
      roundDiv.appendChild(playerDiv);
    });
  });

  app.appendChild(roundDiv);
}

// --- Match beenden ---
function finishMatch(gameDayId, matchId){
  const day = state.gameDays.find(gd=>gd.id===gameDayId);
  const match = day.matches.find(m=>m.id===matchId);
  if(!match || match.finished) return;

  // Prüfen, ob alle Spieler Runden haben
  const incomplete = match.teams.some((team,tIdx)=>{
    return team.players.some(p=>!match.pendingRounds[tIdx] || !match.pendingRounds[tIdx][p]);
  });
  if(incomplete){
    alert("Nicht alle Spieler haben ihre Runde abgeschlossen!");
    return;
  }

  // Punkte ins Match übertragen
  match.teams.forEach((team,tIdx)=>{
    team.players.forEach(p=>{
      const round = match.pendingRounds[tIdx][p];
      team.rounds.push(round);
      const points = round.reduce((a,b)=>a+b,0);
      team.totalScore += points;
      state.players[p].rounds.push(round);
      state.players[p].points += points;
      const oppIdx = tIdx===0?1:0;
      const oppPoints = match.teams[oppIdx].rounds.flat().reduce((a,b)=>a+b,0);
      state.players[p].opponentPoints += oppPoints;
      state.players[p].averagePerSack = state.players[p].rounds.flat().reduce((a,b)=>a+b,0)/state.players[p].rounds.flat().length;
      state.players[p].games++;
    });
  });

  // Sieger bestimmen
  const winnerIdx = match.teams[0].totalScore>match.teams[1].totalScore?0:1;
  match.teams[winnerIdx].players.forEach(p=>state.players[p].wins++);

  match.finished = true;
  render();
}

// --- Leaderboard ---
function leaderboard(){
  const players = Object.entries(state.players).map(([name,stats])=>({name,...stats}));
  players.sort((a,b)=>{
    if(b.wins!==a.wins) return b.wins-a.wins;
    if(b.points!==a.points) return b.points-a.points;
    return b.averagePerSack - a.averagePerSack;
  });
  return players;
}

// --- Render ---
function render(){
  saveState(state);
  app.innerHTML="";

  const ctrlDiv = document.createElement("div");
  ctrlDiv.innerHTML=`
    <button class="btn" onclick="addGameDay()">+ Spieltag</button>
    <button class="btn" onclick="renderGlobalLeaderboard()">Globales Leaderboard</button>
  `;
  app.appendChild(ctrlDiv);

  state.gameDays.forEach(day=>{
    const div = document.createElement("div");
    div.className="card";
    div.innerHTML=`<h2>${day.name}</h2>`;

    const addMatchBtn = document.createElement("button");
    addMatchBtn.className="btn";
    addMatchBtn.textContent="+ Match hinzufügen";
    addMatchBtn.onclick=()=>addMatchToGameDay(day.id,"1v1");
    div.appendChild(addMatchBtn);

    day.matches.forEach(m=>{
      const matchDiv = document.createElement("div");
      matchDiv.className="card";
      matchDiv.innerHTML=`<b>Match ${m.number}</b> ${m.finished?"(Beendet)":""}`;

      if(m.teams.length===0 && !m.finished){
        const selBtn = document.createElement("button");
        selBtn.className="btn";
        selBtn.textContent="Spieler wählen";
        selBtn.onclick=()=>selectPlayers(day.id,m.id);
        matchDiv.appendChild(selBtn);
      } else if(!m.finished){
        const roundBtn = document.createElement("button");
        roundBtn.className="btn";
        roundBtn.textContent="Neue Runde eingeben";
        roundBtn.onclick=()=>addRoundUI(day.id,m.id);
        matchDiv.appendChild(roundBtn);

        const finBtn = document.createElement("button");
        finBtn.className="btn btn-danger";
        finBtn.textContent="Match beenden";
        finBtn.onclick=()=>finishMatch(day.id,m.id);
        matchDiv.appendChild(finBtn);
      }

      m.teams.forEach(team=>{
        matchDiv.innerHTML+=`<div><b>${team.players.join(", ")}</b>: ${team.totalScore}</div>`;
      });

      div.appendChild(matchDiv);
    });

    app.appendChild(div);
  });
}

// --- Global Leaderboard ---
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

// --- Initial render ---
render();


// --- Initial Render ---
render();

