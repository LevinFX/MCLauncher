document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('.nav-button');
    navButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const page = button.getAttribute('data-page');
        location.href = `${page}.html`;
      });
    });
  
    const serverStatusDiv = document.getElementById('server-status');
    const serverIP = "GommeHD.net";
    const apiUrl = `https://api.mcsrvstat.us/2/${serverIP}`;
  
    fetch(apiUrl)
      .then(response => response.json())
      .then(data => {
        if (data.online) {
          const motd = data.motd && data.motd.html ? data.motd.html.join('<br>') : "Keine MOTD verfügbar";
          let playerListHtml = "";
  
          if (data.players && data.players.list && data.players.list.length > 0) {
            playerListHtml = data.players.list.map(player => {
              return `
                <div class="player">
                  <img src="https://craftatar.com/avatars/${player}?size=50" alt="${player}" class="avatar">
                  <span class="player-name">${player}</span>
                </div>
              `;
            }).join('');
          } else {
            playerListHtml = `<p class="no-players">Keine Spieler online.</p>`;
          }
  
          serverStatusDiv.innerHTML = `
            <p>Status: <span class="status online">Online</span></p>
            <p>Version: <span class="server-info">${data.version}</span></p>
            <p>MOTD: <span class="motd">${motd}</span></p>
            <p>Spieler online: <span class="server-info">${data.players.online} / ${data.players.max}</span></p>
            <div class="player-list">${playerListHtml}</div>
          `;
        } else {
          serverStatusDiv.innerHTML = `
            <p>Status: <span class="status offline">Offline</span></p>
            <p class="server-down">Der Server ist momentan nicht erreichbar.</p>
          `;
        }
      })
      .catch(error => {
        serverStatusDiv.innerHTML = `<p class="error">Fehler beim Laden des Serverstatus: ${error}</p>`;
      });
  });
  