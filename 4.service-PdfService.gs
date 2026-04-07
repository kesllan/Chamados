// 4.service-PdfService.gs

/**
 * Serviço responsável pela geração de Termos em PDF conforme modelo NTE.
 */
var PdfService = {

  /**
   * Gera o PDF do Termo de Visita e retorna a URL pública no Drive.
   */
  generateTerm: function(dados, ticket) {
    try {
      // Resolve informações do técnico responsável
      var infoTecnico = this._resolverInfoTecnico(ticket.tecnico);
      
      // Resolve informações dos técnicos auxiliares (lista de e-mails)
      var auxiliares = [];
      if (dados.tecnicosAuxiliares && Array.isArray(dados.tecnicosAuxiliares)) {
        var self = this;
        auxiliares = dados.tecnicosAuxiliares.map(function(email) {
          return self._resolverInfoTecnico(email);
        });
      }

      var info = {
        protocolo: ticket.protocolo,
        escola: ticket.escola,
        municipio: ticket.municipio,
        tecnico: infoTecnico.nome,
        masp: infoTecnico.masp,
        auxiliares: auxiliares,
        assinanteEscola: dados.nomeAssinante || "",
        dataAtendimento: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy"),
        horaInicio: dados.horaInicio || "",
        horaFim: dados.horaFim || "",
        solucao: dados.solucao || ticket.solucao || ""
      };

      var html = this._buildHtml(info);
      
      var blob = Utilities.newBlob(html, "text/html", "Termo_" + info.protocolo + ".html");
      var pdf = blob.getAs("application/pdf");
      
      var cleanEscola = String(info.escola).split(' - ').pop().substring(0, 20).trim();
      pdf.setName("Termo_Visita_" + info.protocolo + "_" + cleanEscola + ".pdf");

      var agora = new Date();
      var ano = agora.getFullYear().toString();
      var nomeMes = this._getNomeMes(agora.getMonth());

      var pastaRaiz = this._obterOuCriarPasta(DriveApp.getRootFolder(), "Termos_NTE");
      var pastaAno = this._obterOuCriarPasta(pastaRaiz, ano);
      var pastaMes = this._obterOuCriarPasta(pastaAno, nomeMes);

      var arquivo = pastaMes.createFile(pdf);
      arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      return arquivo.getUrl();

    } catch (e) {
      Logger.log("Erro em PdfService.generateTerm: " + e.toString());
      throw e;
    }
  },

  /**
   * Constrói o HTML baseado no modelo visual solicitado.
   * @private
   */
  _buildHtml: function(info) {
    var tecPrincipalStr = info.tecnico + (info.masp ? " (MASP: " + info.masp + ")" : "");
    var todosTecnicos = [tecPrincipalStr];
    
    info.auxiliares.forEach(function(aux) {
      todosTecnicos.push(aux.nome + (aux.masp ? " (MASP: " + aux.masp + ")" : ""));
    });

    var tecnicosStr = todosTecnicos.join(" / ");

    var periodoTexto = "";
    if (info.horaInicio && info.horaFim) {
      periodoTexto = `<div style="margin-top: 5px;"><span class="label">PERÍODO DE ATENDIMENTO:</span> <span class="value">${info.horaInicio} às ${info.horaFim}</span></div>`;
    }

    var assinaturasAuxiliaresHtml = "";
    info.auxiliares.forEach(function(aux) {
      assinaturasAuxiliaresHtml += `
        <div style="text-align: center; margin-top: 30px;">
          <div class="line" style="width: 40%;"></div>
          <span class="footer-label">${aux.nome}${aux.masp ? " - MASP: " + aux.masp : ""}</span>
          <span class="footer-sub">Técnico Auxiliar</span>
        </div>`;
    });

    return `
    <html>
    <head>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
        body { font-family: 'Roboto', sans-serif; padding: 20px; color: #000; line-height: 1.4; }
        
        /* BORDAS SUAVES NO CABEÇALHO */
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .header-table td { border: 1px solid #ccc; text-align: center; vertical-align: middle; padding: 10px; }
        .header-nte { width: 20%; font-weight: bold; font-size: 16px; line-height: 1.1; color: #333; }
        
        /* Espaço ampliado para o carimbo dentro da tabela com borda suave */
        .header-stamp-cell { width: 55%; font-size: 9px; color: #999; text-transform: uppercase; letter-spacing: 1px; height: 100px; }
        
        .header-protocolo { width: 25%; font-weight: bold; font-size: 16px; color: #333; }
        
        .title { text-align: center; font-weight: bold; font-size: 20px; margin-bottom: 25px; text-transform: uppercase; color: #000; }
        
        .info-box { border: 1.5px solid #000; padding: 15px; background-color: #fff; margin-bottom: 20px; }
        .label { font-weight: bold; font-size: 10px; color: #333; text-transform: uppercase; }
        .value { font-size: 13px; font-weight: 500; display: inline-block; margin-left: 5px; }
        
        .section-label { font-weight: bold; font-size: 11px; margin-bottom: 5px; text-transform: uppercase; }
        .solucao-box { border: 1.5px solid #000; padding: 15px; font-size: 14px; margin-bottom: 20px; text-align: justify; min-height: 150px; height: auto; }
        
        .declaracao { font-size: 10px; margin-bottom: 40px; color: #444; font-style: italic; }
        
        .signature-container { width: 100%; margin-top: 30px; }
        .signature-row { width: 100%; margin-bottom: 30px; display: table; }
        .signature-box { width: 48%; display: table-cell; text-align: center; vertical-align: top; }
        .line { border-top: 1px solid #000; width: 80%; margin: 0 auto 5px auto; }
        .footer-label { font-size: 11px; display: block; font-weight: bold; }
        .footer-sub { font-size: 9px; color: #666; display: block; }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td class="header-nte">NTE<br><span style="font-size:10px">SRE T. OTONI</span></td>
          <td class="header-stamp-cell">ESPAÇO RESERVADO PARA CARIMBO DA ESCOLA</td>
          <td class="header-protocolo">Nº ${info.protocolo}</td>
        </tr>
      </table>

      <div class="title">Termo de Visita Técnica</div>

      <div class="info-box">
        <div style="margin-bottom: 8px;">
          <span class="label">Escola:</span> <span class="value">${info.escola}</span>
        </div>
        <div style="display: table; width: 100%; margin-bottom: 8px;">
          <div style="display: table-cell; width: 50%;">
            <span class="label">Município:</span> <span class="value" style="text-transform: uppercase;">${info.municipio}</span>
          </div>
          <div style="display: table-cell; width: 50%;">
            <span class="label">Data:</span> <span class="value">${info.dataAtendimento}</span>
          </div>
        </div>
        <div>
          <span class="label">Técnico(s):</span> <span class="value">${tecnicosStr}</span>
        </div>
        ${periodoTexto}
      </div>

      <div class="section-label">Descrição dos Serviços Realizados / Solução Técnica:</div>
      <div class="solucao-box">${(info.solucao || "<i>Nenhum detalhe informado.</i>").replace(/\n/g, "<br>")}</div>

      <div class="declaracao">
        Declaramos para os devidos fins que os serviços acima descritos foram realizados e os equipamentos/sistemas encontram-se em pleno funcionamento.
      </div>

      <div class="signature-container">
        <div class="signature-row">
          <div class="signature-box">
            <div class="line"></div>
            <span class="footer-label">${info.tecnico}${info.masp ? " - MASP: " + info.masp : ""}</span>
            <span class="footer-sub">Analista/Técnico NTE</span>
          </div>
          <div class="signature-box" style="width: 4%;"></div>
          <div class="signature-box">
            <div class="line"></div>
            <span class="footer-label">${info.assinanteEscola || "&nbsp;"}</span>
            <span class="footer-sub">Ass assinatura do Servidor / Carimbo</span>
          </div>
        </div>
        
        ${assinaturasAuxiliaresHtml}
      </div>
    </body>
    </html>
    `;
  },

  /**
   * Busca o nome real e MASP do técnico caso o valor fornecido seja um e-mail.
   * @private
   */
  _resolverInfoTecnico: function(valor) {
    if (!valor) return { nome: "", masp: "" };
    
    // Se não tiver @, pode ser um nome digitado manualmente
    if (valor.indexOf("@") === -1) return { nome: valor, masp: "" };

    try {
      var tecnicos = TechnicianRepository.findAll();
      var tec = tecnicos.find(function(t) { 
        return String(t.email).toLowerCase() === String(valor).toLowerCase(); 
      });
      if (tec) {
        return { nome: tec.nome, masp: tec.masp || "" };
      }
      return { nome: valor.split("@")[0], masp: "" }; // Fallback
    } catch (e) {
      return { nome: valor.split("@")[0], masp: "" };
    }
  },

  _getNomeMes: function(indice) {
    var meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return meses[indice];
  },

  _obterOuCriarPasta: function(parent, nome) {
    var pastas = parent.getFoldersByName(nome);
    if (pastas.hasNext()) return pastas.next();
    return parent.createFolder(nome);
  }
};
