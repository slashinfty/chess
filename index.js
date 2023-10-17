/* Imports */
import TournamentOrganizer from "https://unpkg.com/tournament-organizer@3.3.1/dist/index.module.js";
import * as DataTable from "./DataTables/datatables.js";

/* Initial setup */
const TO = new TournamentOrganizer();
let tournament;

/* Tables */
const playersTable = $('#playersTable').DataTable({
    data: [],
    scrollY: '60vh',
    autoWidth: false,
    paging: false,
    dom: 'Bfrtip',
    buttons: [
        'print'
    ],
    order: [
        [1, 'asc']
    ],
    columns: [
        {title: 'ID', data: 'id', width: '25%'},
        {title: 'Name', data: 'name', render: (d, t, r) => `${d} (${r.value})`, width: '55%'},
        {title: 'Active', data: 'active', width: '20%'}
    ]
});

const pairingsTable = $('#pairingsTable').DataTable({
    data: [],
    scrollY: '60vh',
    autoWidth: false,
    paging: false,
    dom: 'Bfrtip',
    buttons: [
        'print'
    ],
    columnDefs: [{
        className: 'dt-center',
        targets: [0, 3, 4]
    }],
    columns: [
        {title: 'Board', data: 'match', width: '10%'},
        {title: 'White', data: 'player1.id', render: (d, t, r) => {
            if (d === null) return 'Bye';
            const player = tournament.players.find(p => p.id === d);
            return `${player.name} (${player.value})`
        }, width: '35%'},
        {title: 'Black', data: 'player2.id', render: (d, t, r) => {
            if (d === null) return 'Bye';
            const player = tournament.players.find(p => p.id === d);
            return `${player.name} (${player.value})`
        }, width: '35%'},
        {title: 'Result', data: 'active', render: (d, t, r) => d === true ? '0-0' : r.player1.draw === 1 && r.player2.draw === 1 ? '0.5-0.5' : `${r.player1.win}-${r.player2.win}`, width: '10%'},
        {title: 'Active', data: 'active', width: '10%'}
    ]
});

const standingsTableConfig = {
    data: [],
    scrollY: '60vh',
    autoWidth: false,
    paging: false,
    dom: 'Bfrtip',
    buttons: [
        'print'
    ]
}

let standingsTable = $('#standingsTable').DataTable({
    ...standingsTableConfig,
    columns: [
        {title: 'BLANK', data: 'BLANK'}
    ]
});

/* Check local storage on load */
(function () {
    const saved = window.localStorage.getItem('tournament');
    if (saved === null || saved === undefined) return;
    document.getElementById('continue').style.display = 'block';
    buttonToggle();
})();

/* Event listeners */
document.getElementById('importBtn').addEventListener('change', importButton);
document.getElementById('exportBtn').addEventListener('click', exportButton);
document.getElementById('continueBtn').addEventListener('click', continueButton);
document.getElementById('setupBtn').addEventListener('click', setupButton);
document.getElementById('playersBtn').addEventListener('click', playersButton);
document.getElementById('pairingsBtn').addEventListener('click', pairingsButton);
document.getElementById('standingsBtn').addEventListener('click', standingsButton);
document.getElementById('createBtn').addEventListener('click', createButton);
document.getElementById('addPlayerBtn').addEventListener('click', addPlayerButton);
document.getElementById('removePlayerBtn').addEventListener('click', removePlayerButton);
document.getElementById('startTournamentBtn').addEventListener('click', startTournamentButton);
document.getElementById('roundNumber').addEventListener('change', updatePairings);
document.getElementById('nextRoundBtn').addEventListener('click', nextRoundButton);
document.getElementById('whiteWinsBtn').addEventListener('click', () => result('w'));
document.getElementById('drawBtn').addEventListener('click', () => result('d'));
document.getElementById('blackWinsBtn').addEventListener('click', () => result('b'));

/* Button functions */
function importButton() {
    const file = document.getElementById('importBtn').files[0];
    const reader = new FileReader();
    reader.onloadend = () => loadTournament(JSON.parse(reader.result));
    reader.readAsText(file);
}

function exportButton() {
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(tournament, null, 4))}`);
    element.setAttribute('download', `${tournament.name}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function continueButton() {
    loadTournament(JSON.parse(window.localStorage.getItem('tournament')));
}

function setupButton() {
    [...document.querySelectorAll('.main')].forEach(el => el.style.display = 'none');
    if (tournament !== undefined) {
        document.getElementById('tournamentName').value = tournament.name;
        document.getElementById('tournamentRoundCount').value = tournament.stageOne.rounds;
    }
    document.getElementById('setup').style.display = 'block';
}

function playersButton() {
    [...document.querySelectorAll('.main')].forEach(el => el.style.display = 'none');
    document.getElementById('players').style.display = 'block';
    playersTable.draw();
}

function pairingsButton() {
    [...document.querySelectorAll('.main')].forEach(el => el.style.display = 'none');
    document.getElementById('pairings').style.display = 'block';
    pairingsTable.draw();
}

function standingsButton() {
    [...document.querySelectorAll('.main')].forEach(el => el.style.display = 'none');
    document.getElementById('standings').style.display = 'block';
    standingsTable.draw();
}

function createButton() {
    const name = document.getElementById('tournamentName').value;
    if (name === undefined || name === null || name === '') return;
    const format = document.getElementById('tournamentFormat').value;
    const rounds = document.getElementById('tournamentRoundCount').value;
    tournament = TO.createTournament(name, {
        colored: true,
        sorting: 'descending',
        scoring: {
            tiebreaks: format === 'swiss' ? [
                'median buchholz',
                'solkoff',
                'cumulative',
                'versus'
            ] : [
                'sonneborn berger',
                'versus'
            ]
        },
        stageOne: {
            format: format,
            rounds: typeof rounds === 'number' && format === swiss ? rounds : 0
        }
    });
    initialize();
}

function addPlayerButton() {
    const name = document.getElementById('playerName').value;
    if (name === undefined || name === null || name === '') return;
    let rating = document.getElementById('playerRating').value;
    rating = rating === undefined || rating === null || rating === '' ? 0 : parseInt(rating);
    document.getElementById('playerName').value = '';
    document.getElementById('playerRating').value = '';
    let player;
    try {
        player = tournament.createPlayer(name);
        player.values = {
            value: rating
        }
    } catch (e) {
        console.error(e);
        return;
    }
    save();
    buttonToggle();
    updatePlayers();
}

function removePlayerButton() {
    const id = document.getElementById('playerID').value;
    if (id === undefined || id === null || id === '') return;
    document.getElementById('playerID').value = '';
    try {
        tournament.removePlayer(id);
    } catch (e) {
        console.error(e);
        return;
    }
    save();
    updatePlayers();
}

function startTournamentButton() {
    try {
        tournament.start();
    } catch (e) {
        console.error(e);
        return;
    }
    save();
    buttonToggle();
    updatePairings();
    updateStandings();
}

function nextRoundButton() {
    try {
        tournament.next();
    } catch (e) {
        console.error(e);
        return;
    }
    save();
    buttonToggle();
    document.getElementById('roundNumber').value = tournament.round;
    updatePairings();
    updateStandings();
}

function result(res) {
    const round = parseInt(document.getElementById('roundNumber').value);
    if (round === undefined || round === null || round === '') return;
    const board = parseInt(document.getElementById('boardNumber').value);
    if (board === undefined || board === null || board === '') return;
    document.getElementById('boardNumber').value = '';
    const match = tournament.matches.find(m => m.round === round && m.match === board);
    try {
        tournament.enterResult(match.id, res === 'w' ? 1 : 0, res === 'b' ? 1 : 0, res === 'd' ? 1 : 0);
    } catch (e) {
        console.error(e);
        return;
    }
    save();
    buttonToggle();
    updatePairings();
    updateStandings();
}

/* Utility functions */
function loadTournament(contents) {
    tournament = TO.reloadTournament(contents);
    if (tournament.round > 1) {
        document.getElementById('roundNumber').value = tournament.round;
    }
    initialize();
    updatePlayers();
    updatePairings();
    updateStandings();
}

function save() {
    window.localStorage.setItem('tournament', JSON.stringify(tournament));
}

function updatePlayers() {
    playersTable.clear();
    playersTable.rows.add(tournament.players);
    playersTable.draw();
}

function updatePairings() {
    pairingsTable.clear();
    pairingsTable.rows.add(tournament.matches.filter(m => m.round === Number(document.getElementById('roundNumber').value)));
    pairingsTable.draw();
}

function updateStandings() {
    standingsTable.clear();
    standingsTable.rows.add(tournament.standings().map((player, index) => ({
        rank: index + 1,
        ...player
    })));
    standingsTable.draw();
}

function initialize() {
    save();
    document.getElementById('continue').style.display = 'none';
    document.title = tournament.name;
    standingsTable.destroy();
    $('#standingsTable').empty();
    standingsTable = $('#standingsTable').DataTable({
        ...standingsTableConfig,
        columnDefs: [{
            className: 'dt-center',
            targets: tournament.stageOne.format === 'swiss' ? [0, 2, 3, 4, 5, 6] : [0, 2, 3]
        }],
        columns: tournament.stageOne.format === 'swiss' ? [
            {title: 'Rank', data: 'rank', width: '10%'},
            {title: 'Name', data: 'player', render: (d, t, r) => `${d.name} (${d.value})`, width: '40%'},
            {title: 'Points', data: 'matchPoints', width: '10%'},
            {title: 'TB#1', data: 'tiebreaks.medianBuchholz', width: '10%'},
            {title: 'TB#2', data: 'tiebreaks.solkoff', width: '10%'},
            {title: 'TB#3', data: 'tiebreaks.cumulative', width: '10%'},
            {title: 'TB#4', data: 'tiebreaks.oppCumulative', width: '10%'}
        ] : [
            {title: 'Rank', data: 'rank', width: '10%'},
            {title: 'Name', data: 'player', render: (d, t, r) => `${d.name} (${d.value})`, width: '70%'},
            {title: 'Points', data: 'matchPoints', width: '10%'},
            {title: 'S-B', data: 'tiebreaks.sonnebornBerger', width: '10%'}
        ]
    });
    document.getElementById('tiebreakers').innerText = tournament.stageOne.format === 'swiss' ? `TB#1: Median-Buchholz · TB#2: Solkoff · TB#3: Cumulative · TB#4: Opponent's Cumulative` : `S-B: Sonneborn-Berger`;
    buttonToggle();
}

function buttonToggle() {
    if (tournament === undefined) {
        document.getElementById('exportBtn').disabled = true;
        document.getElementById('playersBtn').disabled = true;
        document.getElementById('pairingsBtn').disabled = true;
        document.getElementById('standingsBtn').disabled = true;
        document.getElementById('createBtn').disabled = false;
        document.getElementById('tournamentName').disabled = false;
        document.getElementById('tournamentFormat').disabled = false;
        document.getElementById('tournamentRoundCount').disabled = false;
        return;
    } else {
        document.getElementById('exportBtn').disabled = false;
        document.getElementById('playersBtn').disabled = false;
        document.getElementById('pairingsBtn').disabled = false;
        document.getElementById('standingsBtn').disabled = false;
        document.getElementById('createBtn').disabled = true;
        document.getElementById('tournamentName').disabled = true;
        document.getElementById('tournamentFormat').disabled = true;
        document.getElementById('tournamentRoundCount').disabled = true;
    }
    if (tournament.status === 'setup') {
        document.getElementById('pairingsBtn').disabled = true;
        document.getElementById('standingsBtn').disabled = true;
        document.getElementById('addPlayerBtn').disabled = false;
        if (tournament.players.filter(p => p.active === true).length > 1) {
            document.getElementById('startTournamentBtn').disabled = false;
        } else {
            document.getElementById('startTournamentBtn').disabled = true;
        }
    } else {
        document.getElementById('pairingsBtn').disabled = false;
        document.getElementById('standingsBtn').disabled = false;
        document.getElementById('addPlayerBtn').disabled = true;
        document.getElementById('startTournamentBtn').disabled = true;
    }
    if (tournament.status === 'complete') {
        document.getElementById('removePlayerBtn').disabled = true;
        document.getElementById('nextRoundBtn').disabled = true;
    } else {
        document.getElementById('removePlayerBtn').disabled = false;
        if (tournament.matches.filter(m => m.round === tournament.round).every(m => m.active === false)) {
            document.getElementById('nextRoundBtn').disabled = false;
        } else {
            document.getElementById('nextRoundBtn').disabled = true;
        }
    }
}
