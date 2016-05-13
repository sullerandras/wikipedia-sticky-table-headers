// ==UserScript==
// @name         Wikipedia sticky table headers
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Displayes the table headers on the top of the screen while otherwise the table header would not be visible. Useful for tall tables with many columns.
// @author       Andras Suller
// @match        https://*.wikipedia.org/wiki/*
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    var bigTables = [];
    var newTables = [];

    /** Returns the first row where all cells have colSpan == 1 */
    function getHeaderRowForTable(table) {
        var rows = table.querySelectorAll('tr');
        for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            var row = rows[rowIndex];
            var cells = row.children;
            var good = true;
            for (var colIndex = 0; colIndex < cells.length; colIndex++) {
                var cell = cells[colIndex];
                if (cell.colSpan > 1) {
                    good = false;
                    break;
                }
            }
            if (good) {
                return row;
            }
        }
        return rows[0];
    }
    function addHeaderToTable(table) {
        var headerRow = getHeaderRowForTable(table);

        var newTable = document.createElement('table');
        table.parentNode.insertBefore(newTable, table);
        newTable.className = table.className.replace('collapsible', '');
        newTable.style.position = 'fixed';
        newTable.style.display = 'none';
        newTable.style.top = '0';
        newTable.style.margin = '0';
        newTable.style['table-layout'] = 'fixed';

        var newTr = document.createElement('tr');
        newTable.appendChild(newTr);
        newTr.innerHTML = headerRow.innerHTML;
        setNewCellsWidth(headerRow, newTr);
        copyEventHandlers(headerRow, newTr);

        newTable.oldHeaderRow = headerRow;
        newTable.thresholdToShow = headerRow.offsetTop;
        return newTable;
    }

    function setNewCellsWidth(headerRow, newTr) {
        for (var i = 0; i < headerRow.children.length; i++) {
            var cell = headerRow.children[i];
            var newCell = newTr.children[i];
            newCell.style.width = cell.offsetWidth + 'px';
            newCell.style['box-sizing'] = 'border-box';
        }
    }

    function copyEventHandlers(headerRow, newTr) {
        var $ = unsafeWindow.jQuery;
        if (!$) {
            console.log('no jQuery!');
            return;
        }
        for (var i = 0; i < headerRow.children.length; i++) {
            var cell = headerRow.children[i];
            var newCell = newTr.children[i];

            var events = $._data(cell, 'events');
            if (events) {
                $.each(events, function() {
                    // iterate registered handler of original
                    $.each(this, function() {
                        var handler = this.handler;
                        $(newCell).bind(this.type, function(){
                            // the event handler function is called with "this" set to newCell, but it breaks
                            // table sorts, so we call the event handler with "this" bound to cell as it would
                            // be if the users clicks on the original table header.
                            handler.apply(cell, arguments);
                        });
                    });
                });
            } else {
//                console.log('no events for', cell, $.expando, cell[$.expando]);
            }
        }
    }

    function run() {
        var tables = document.getElementsByTagName('table');
        for (var i = 0; i < tables.length; i++) {
            var table=tables[i];
            if (table.offsetHeight >= window.innerHeight) {
                bigTables.push(table);
            }
        }

        for (i = 0; i < bigTables.length; i++) {
            newTables.push(addHeaderToTable(bigTables[i]));
        }
        unsafeWindow.bigTables = bigTables;
        unsafeWindow.newTables = newTables;

        setInterval(function(){
            if (!document.body.onscroll) {
                console.log('adding onscroll to body');
                document.body.onscroll = handleOnScroll;
            }
        }, 1000);
        handleOnScroll();
        unsafeWindow.onresize = function() {
            console.log('onresize');
            for (var i = 0; i < bigTables.length; i++) {
                var table = bigTables[i];
                var newTable = newTables[i];
                var headerRow = newTable.oldHeaderRow;
                var newTr = newTable.querySelectorAll('tr')[0];
                setNewCellsWidth(headerRow, newTr);
                copyEventHandlers(headerRow, newTr);
            }
            handleOnScroll();
        };
    }

    function handleOnScroll() {
        for (var i = 0; i < bigTables.length; i++) {
            var table = bigTables[i];
            var newTable = newTables[i];
            var rect = table.getBoundingClientRect();
            if (rect.top < 0 && -rect.top > newTable.thresholdToShow && -rect.top < rect.height) {
                newTable.style.display = 'table';
            } else {
                newTable.style.display = 'none';
            }
            newTable.style.left = rect.left + 'px';
            newTable.style.width = table.offsetWidth + 'px';
        }
    }

    setTimeout(run, 1000);
})();