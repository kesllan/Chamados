// src/utils/DateUtils.js

/**
 * Utilitários para manipulação de datas e dias úteis.
 */
var DateUtils = {
  
  /**
   * Converte um valor em objeto Date de forma segura.
   * @param {any} val - Valor a ser convertido.
   * @return {Date|null} Objeto Date ou null se inválido.
   */
  ensureDate: function(val) {
    if (!val) return null;
    if (val instanceof Date) return val;
    var d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  },

  /**
   * Calcula a diferença em dias úteis entre duas datas, excluindo fins de semana e feriados.
   * @param {Date|string} startDate - Data inicial.
   * @param {Date|string} endDate - Data final.
   * @param {Array<string>} holidays - Lista de datas de feriados (strings "yyyy-mm-dd" ou similar).
   * @return {number} Número de dias úteis.
   */
  calculateBusinessDays: function(startDate, endDate, holidays) {
    var s = this.ensureDate(startDate);
    var e = this.ensureDate(endDate);
    if (!s || !e) return 0;
    
    var count = 0;
    var curDate = new Date(s.getTime());
    var end = new Date(e.getTime());
    
    // Normaliza para início do dia para comparação justa
    curDate.setHours(0,0,0,0);
    end.setHours(0,0,0,0);

    // Lista de feriados normalizada para comparação
    var holidaySet = {};
    if (holidays) {
      holidays.forEach(function(h) {
        var d = new Date(h);
        if (!isNaN(d.getTime())) {
          d.setHours(0,0,0,0);
          holidaySet[d.getTime()] = true;
        }
      });
    }

    while (curDate <= end) {
      var dayOfWeek = curDate.getDay();
      var isWeekend = (dayOfWeek === 0 || dayOfWeek === 6); // 0=Dom, 6=Sab
      var isHoliday = holidaySet[curDate.getTime()];

      if (!isWeekend && !isHoliday) {
        count++;
      }
      curDate.setDate(curDate.getDate() + 1);
    }
    return count;
  },

  /**
   * Soma dias úteis a uma data inicial.
   * @param {Date|string} startDate
   * @param {number} days
   * @param {Array<string>} holidays
   * @return {Date} Nova data.
   */
  addBusinessDays: function(startDate, days, holidays) {
    var s = this.ensureDate(startDate);
    if (!s) return new Date();

    var count = 0;
    var curDate = new Date(s.getTime());
    
    // Normaliza feriados
    var holidaySet = {};
    if (holidays) {
      holidays.forEach(function(h) {
        var d = new Date(h);
        if (!isNaN(d.getTime())) {
          d.setHours(0,0,0,0);
          holidaySet[d.getTime()] = true;
        }
      });
    }

    while (count < days) {
      curDate.setDate(curDate.getDate() + 1);
      var dayOfWeek = curDate.getDay();
      var isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      
      // Normaliza dia atual para check de feriado
      var checkDate = new Date(curDate.getTime());
      checkDate.setHours(0,0,0,0);
      
      if (!isWeekend && !holidaySet[checkDate.getTime()]) {
        count++;
      }
    }
    return curDate;
  },

  /**
   * Formata data para dd/MM/yyyy HH:mm
   */
  format: function(date) {
    var d = this.ensureDate(date);
    if (!d) return "";
    return Utilities.formatDate(d, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  }
};
