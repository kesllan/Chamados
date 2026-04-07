/**
 * SCRIPT DE REPARO DE EMERGÊNCIA - EXECUTAR APENAS UMA VEZ
 * Objetivo: Corrigir a numeração de 2026 que duplicou após o 20260034.
 */
function runOneTimeProtocolRepair() {
  var ss = BaseRepository.getSpreadsheet();
  var sheetChamados = ss.getSheetByName(AppConfig.SHEET_NAMES.CHAMADOS);
  var sheetHistorico = ss.getSheetByName(AppConfig.SHEET_NAMES.LOG_STATUS);
  
  var range = sheetChamados.getDataRange();
  var data = range.getValues();
  var headers = data[0];
  
  var colProtocolo = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.PROTOCOLO);
  var colObs = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.OBSERVACOES);
  var colEmail = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.EMAIL_INSTITUCIONAL);
  var colEscola = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.ESCOLA);

  var protocolosVistos = {};
  var correcoes = 0;
  
  // Mapeia os maiores sequenciais por ano para não sobrescrever
  var seqPorAno = {};
  for (var i = 1; i < data.length; i++) {
    var p = String(data[i][colProtocolo]).trim();
    if (p.length === 8) {
      var ano = p.substring(0, 4);
      var seq = parseInt(p.substring(4), 10);
      if (!isNaN(seq)) {
        if (!seqPorAno[ano] || seq > seqPorAno[ano]) seqPorAno[ano] = seq;
      }
    }
  }

  Logger.log("Sequenciais iniciais: " + JSON.stringify(seqPorAno));

  for (var i = 1; i < data.length; i++) {
    var protocoloOriginal = String(data[i][colProtocolo]).trim();
    var anoReferencia = protocoloOriginal.length >= 4 ? protocoloOriginal.substring(0, 4) : "2026";
    
    // Identifica duplicata ou formato inválido
    var isDuplicata = (protocoloOriginal !== "" && protocolosVistos[protocoloOriginal]);
    var isForaPadrao = (protocoloOriginal.length !== 8);

    if (isDuplicata || isForaPadrao) {
      // GERA NOVO PROTOCOLO
      if (!seqPorAno[anoReferencia]) seqPorAno[anoReferencia] = 0;
      seqPorAno[anoReferencia]++;
      
      var novoProtocolo = anoReferencia + ("0000" + seqPorAno[anoReferencia]).slice(-4);
      
      // Garante que não colida com algo já existente
      while (protocolosVistos[novoProtocolo]) {
        seqPorAno[anoReferencia]++;
        novoProtocolo = anoReferencia + ("0000" + seqPorAno[anoReferencia]).slice(-4);
      }

      Logger.log("LINHA " + (i+1) + ": " + protocoloOriginal + " -> " + novoProtocolo);

      // 1. Notifica a Escola
      var email = colEmail > -1 ? data[i][colEmail] : "";
      var nomeEscola = colEscola > -1 ? data[i][colEscola] : "Escola";
      if (email && email.indexOf("@") > -1) {
        NotificationService.sendProtocolCorrection(email, { escola: nomeEscola, antigo: protocoloOriginal, novo: novoProtocolo });
      }

      // 2. Anexa nota nas Observações
      if (colObs > -1) {
        var obs = String(data[i][colObs]);
        var nota = "\n[SISTEMA]: Protocolo corrigido de " + (protocoloOriginal || "Vazio") + " para " + novoProtocolo + " devido a duplicidade.";
        data[i][colObs] = (obs + nota).trim();
      }

      // 3. Atualiza Histórico
      if (protocoloOriginal !== "" && sheetHistorico) {
        _repairUpdateHistory(sheetHistorico, protocoloOriginal, novoProtocolo);
      }

      // 4. Atualiza na matriz
      data[i][colProtocolo] = novoProtocolo;
      protocolosVistos[novoProtocolo] = true;
      correcoes++;
    } else {
      protocolosVistos[protocoloOriginal] = true;
    }
  }

  if (correcoes > 0) {
    range.setValues(data);
    // Sincroniza o controle global para o futuro
    var anoAtual = new Date().getFullYear().toString();
    BaseRepository.setSystemConfig("ULTIMO_PROTOCOLO", anoAtual + ("0000" + (seqPorAno[anoAtual] || 0)).slice(-4), "Último protocolo gerado.");
    Logger.log("REPARO CONCLUÍDO: " + correcoes + " chamados corrigidos.");
  } else {
    Logger.log("Nenhuma inconsistência encontrada.");
  }
}

function _repairUpdateHistory(sheet, antigo, novo) {
  var data = sheet.getDataRange().getValues();
  var colIdx = data[0].indexOf(AppConfig.COLUMNS_LOG.PROTOCOLO);
  if (colIdx === -1) return;
  var alterou = false;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colIdx]) === String(antigo)) {
      data[i][colIdx] = novo;
      alterou = true;
    }
  }
  if (alterou) sheet.getDataRange().setValues(data);
}
