"use strict";

const PROVIDERS_LABEL = 'Поставщики';
const RESERVE_LABEL = 'Запасы';
const CONSUMERS_LABEL = 'Потребители';
const NEEDS_LABEL = 'Потребности';

let PROVIDERS_COUNT = 3;
let CONSUMERS_COUNT = 3;

//Creating table
//document.body.innerHTML += createTable();

let prices_inputs_tmp = createArrayFromNodeList(document.querySelectorAll(`input[id*='price']`));
let reserve_inputs = createArrayFromNodeList(document.querySelectorAll(`input[id*='reserve']`));
let needs_inputs = createArrayFromNodeList(document.querySelectorAll(`input[id*='need']`));
let prices_inputs = [];

for (let i = 0; i < PROVIDERS_COUNT; i++) {
    prices_inputs.push(prices_inputs_tmp.slice(i * PROVIDERS_COUNT, i * PROVIDERS_COUNT + PROVIDERS_COUNT));
}

prices_inputs_tmp = null;


document.body.innerHTML += `<br><h3>Решение</h3>`;

// Проверка задачи на открытость
isOpenOrClose();

// Вычисление первоначального плана поставок
let consumers_start = calcNorthWestMethod();







// Проверка задачи на открытость
function isOpenOrClose(){
    let summ_reserves = 0;
    let summ_needs    = 0;

    needs_inputs.forEach(function (item, i, arr){
        summ_needs += (item.value * 1);
    });

    reserve_inputs.forEach(function (item, i, arr){
        summ_reserves += (item.value * 1);
    });

    if (summ_needs == summ_reserves){
        document.body.innerHTML += `Транспортная задача закрытого типа. `;
    } else {
        if (summ_needs > summ_reserves){
            document.body.innerHTML += `Транспортная задача открытого типа. <i>Необходимо добавить фиктивного поставщика A${PROVIDERS_COUNT} с количеством запасов = ${summ_needs - summ_reserves}</i>`;
            PROVIDERS_COUNT++;
            
        }
    }
}

// Расчет изначального распределения поставок
function calcNorthWestMethod() {
    document.body.innerHTML += `Расчет исходного плана методом северо-западного угла.`;

    let consumers = [];
    let needs_left = [];
    let reserves_left = [];

    // Создание массивов для временных значени
    // остатка резервов и потребностей.
    for (let i = 0; i < reserve_inputs.length; i++) {
        reserves_left.push(reserve_inputs[i].value * 1);
    }
    for (let i = 0; i < needs_inputs.length; i++) {
        needs_left.push(needs_inputs[i].value * 1);
    }

    // Распределение резервов методом северо-западного угла
    for (let i = 0; i < PROVIDERS_COUNT; i++) {
        consumers.push([]);
        for (let j = 0; j < CONSUMERS_COUNT; j++) {

            // Если резерв больше чем необходимо, берем сколько нужно.
            if (needs_left[j] <= reserves_left[i]) {
                consumers[i].push(needs_left[j]);

                reserves_left[i] -= needs_left[j];
                needs_left[j] = 0;
            } else
            // Если резерв меньше чем необходимо, берем сколько есть.
            if (needs_left[j] > reserves_left[i]) {
                consumers[i].push(reserves_left[i]);

                needs_left[j] -= reserves_left[i];
                reserves_left[i] = 0;
            }

            if (consumers[i][j] === 0){
                consumers[i][j] = '-';
            }
        }
    }


    // Вычисление значения целевой функции и количества базисных ячеек
    let summ = 0;
    let summ_basis = 0;
    for (let i = 0; i < PROVIDERS_COUNT; i++) {
        for (let j = 0; j < CONSUMERS_COUNT; j++) {
            if (typeof(consumers[i][j]) == 'number'){
                summ += prices_inputs[i][j].value * consumers[i][j];
                summ_basis++;
            }
        }
    }

    if (summ_basis >= (CONSUMERS_COUNT + PROVIDERS_COUNT - 1)){
        document.body.innerHTML += `<br>Исходный план является невырожденным.`;
    } else {
        let need_to_add_points = CONSUMERS_COUNT + PROVIDERS_COUNT - 1 - summ_basis;
        console.log(`План вырожденный. Необходимо добавить ${need_to_add_points}`)
    }


    document.body.innerHTML += printResultTable(consumers, reserves_left, needs_left);
    document.body.innerHTML += `<i>Суммарная стоимость поставок на данном этапе равна <b>${summ}</b></i>.`;
    return consumers;
}

// Первоначальное создание таблицы
function createTable() {
    let table_html = "<table>";

    // Creating thead Part;
    table_html += `<thead>
                       <tr>
                            <td rowspan="2">${PROVIDERS_LABEL}</td>
                            <td rowspan="2">${RESERVE_LABEL}</td>
                            <td colspan="${CONSUMERS_COUNT}">${CONSUMERS_LABEL}</td>
                       </tr>
                       <tr>
                   `;
    for (let i = 0; i < CONSUMERS_COUNT; i++) {
        table_html += `<td>B${i}</td>`;
    }
    table_html += `</tr></thead>`;


    //Creating tbody part;
    table_html += `<tbody>`;

    for (let i = 0; i < PROVIDERS_COUNT; i++) {
        table_html += `<tr>`;

        table_html += `<td>A${i}</td>`;
        table_html += `<td><input type="text" id="reserve_${i}"></td>`;
        for (let j = 0; j < CONSUMERS_COUNT; j++) {
            table_html += `<td><input type="text" id="consumer_${j}|${i}"></td>`;
        }

        table_html += `</tr>`;
    }

    table_html += `<tr>
                        <td colspan="2">${NEEDS_LABEL}</td>
                    `;
    for (let i = 0; i < CONSUMERS_COUNT; i++) {
        table_html += `<td><input type="text" id="need_${i}"></td>`;
    }

    table_html += `</tr></table>`;

    return table_html;
}

// Отрисовка шага решения
function printResultTable(consumers, reserves, needs) {
    let table_html = "<table>";

    // Creating thead Part;
    table_html += `<thead>
                       <tr>
                            <td rowspan="2">${PROVIDERS_LABEL}</td>
                            <td rowspan="2">${RESERVE_LABEL}</td>
                            <td colspan="${CONSUMERS_COUNT}">${CONSUMERS_LABEL}</td>
                       </tr>
                       <tr>
                   `;
    for (let i = 0; i < CONSUMERS_COUNT; i++) {
        table_html += `<td>B${i}</td>`;
    }
    table_html += `</tr></thead>`;


    //Creating tbody part;
    table_html += `<tbody>`;

    for (let i = 0; i < PROVIDERS_COUNT; i++) {
        table_html += `<tr>`;

        table_html += `<td>A${i}</td>`;
        table_html += `<td><p class="reserve">${reserves[i]}</p></td>`;
        for (let j = 0; j < CONSUMERS_COUNT; j++) {
            table_html += `<td><p class="consumer">${consumers[i][j]}</p></td>`;
        }

        table_html += `</tr>`;
    }

    table_html += `<tr>
                        <td colspan="2">${NEEDS_LABEL}</td>
                    `;
    for (let i = 0; i < CONSUMERS_COUNT; i++) {
        table_html += `<td>${needs[i]}</td>`;
    }

    table_html += `</tr></table>`;

    return table_html;
}

function createArrayFromNodeList(nodeList) {
    let arr = [];
    for (let i = nodeList.length; i--; arr.unshift(nodeList[i]));

    return arr;
}