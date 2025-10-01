const app = document.getElementById("app");

function saveState(state) { localStorage.setItem("cornholeState", JSON.stringify(state)); }
function loadState() { return JSON.parse(localStorage.getItem("cornholeState") || "null"); }

let state = loadState() || { matches: [], players: {} };

function uid() { return Math.random().toString(36).substr(2, 9); }

function addMatch(type="1v1") {
  const id = uid();
  state.matches.push({
    id,
    type,
    teams: [ { name: "Team A", score: 0, players: [] }, { name: "Team B", score: 0, players: [] } ],
    finished: false
  });
  render();
}

function addPoints(matchId, teamIdx, points) {
  const match = state.matches.find(m=>m.id===matchId);
  if(!match || match.finished) return;
  match.teams[teamIdx].score += points;
  render();
}

function finishMatch(matchId) {
  const match = state.matches.find(m=>m.id===matchId);
  if(!match) return;
  match.finished = true;
  match.teams.forEach((team, idx) => {
    team.players.forEach(p => {
      if(!state.players[p]) state.players[p] = { games:0, wins:0, points:0 };
      state.players[p].games++;
      state.players[p].points += team.score;
      if(idx===winnerIndex(match)) state.players[p].wins++;
    });
  });
  render();
}

function winnerIndex(match) {
  return match.teams[0].score > match.teams[1].score ? 0 : 1;
}

function leaderboard() {
  const players = Object.entries(state.players).map(([name,stats])=>({name,...stats}));
  players.sort((a,b)=>{
    if(b.wins!==a.wins) return b.wins-a.wins;
    const ratioA = a.points/a.games;
    const ratioB = b.points/b.games;
    return ratioB - ratioA;
  });
  return players;
}

function render() {
  saveState(state);
  app.innerHTML = "";
  const addBtns = document.createElement("div");
  addBtns.innerHTML = `
    <button class="btn" onclick="addMatch('1v1')">+ Neues 1v1 Match</button>
    <button class="btn" onclick="addMatch('2v2')">+ Neues 2v2 Match</button>`;
  app.appendChild(addBtns);
  state.matches.forEach((m)=>{
    const div = document.createElement("div");
    div.className="card";
    div.innerHTML = `<h2>Match ${m.id} ${m.finished ? "(Beendet)" : ""}</h2>
      <div><b>${m.teams[0].name}</b>: ${m.teams[0].score}</div>
      <div><b>${m.teams[1].name}</b>: ${m.teams[1].score}</div>`;
    if(!m.finished){
      const controls = document.createElement("div");
      controls.innerHTML=`
        <button class="btn" onclick="addPoints('${m.id}',0,1)">Team A +1</button>
        <button class="btn" onclick="addPoints('${m.id}',0,3)">Team A +3</button>
        <button class="btn" onclick="addPoints('${m.id}',1,1)">Team B +1</button>
        <button class="btn" onclick="addPoints('${m.id}',1,3)">Team B +3</button>
        <button class="btn-danger" onclick="finishMatch('${m.id}')">Match beenden</button>`;
      div.appendChild(controls);
    }
    app.appendChild(div);
  });
  const tableDiv = document.createElement("div");
  tableDiv.className="card";
  tableDiv.innerHTML = "<h3>Leaderboard</h3>";
  const table = document.createElement("table");
  table.innerHTML = "<tr><th>Spieler</th><th>Spiele</th><th>Siege</th><th>Punkte gesamt</th><th>Punkteschnitt</th></tr>";
  leaderboard().forEach(p=>{
    const row = document.createElement("tr");
    row.innerHTML = `<td>${p.name}</td><td>${p.games}</td><td>${p.wins}</td><td>${p.points}</td><td>${(p.points/p.games).toFixed(1)}</td>`;
    table.appendChild(row);
  });
  tableDiv.appendChild(table);
  app.appendChild(tableDiv);
}
render();