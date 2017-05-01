function createArrayFromNodeList(nodeList) {
    let arr = [];
    for (let i = nodeList.length; i--; arr.unshift(nodeList[i]));

    return arr;
}

const PROVIDERS_LABEL = 'Поставщики';
const RESERVE_LABEL = 'Запасы';
const CONSUMERS_LABEL = 'Потребители';
const NEEDS_LABEL = 'Потребности';

let PROVIDERS_COUNT      = 3;
let CONSUMERS_COUNT      = 4;
let MAX_ITERATIONS_COUNT = 10;

class TransportTask {

    constructor() {

        this.taskDiv = document.getElementById('task');
        this.solutionDiv = document.getElementById('solution');

    }

    solveTheTask() {
        this.solutionDiv.innerHTML = "";

        this.getTaskValues();
        this.addSolutionText(`<hr><h3>Решение задачи</h3>`);
        this.createProvidersAndConsumers();
        this.checkAndSolveOpenTask();

        let basis_distribution = this.calculateNorthWestMethod();

        for (let i = 0; i < MAX_ITERATIONS_COUNT; i++) {
            console.log(` `);
            console.log(`iteration ${i}`);
            this.checkPotentials(basis_distribution);
            let root_points = this.checkSolution(basis_distribution);

            // Проверяем минимальный коэффициент таблицы.
            // Когда нет отрицательных значений решение можно считать оптимальным
            if (root_points.length < 1) {
                this.addSolutionText(`<h2 style="color:green;">Решение является оптимальным.</h2>`);
                break;
            } else {
                //Вычисляем цикл перераспределения поставок.
                let chain = this.getChainForOptimizeSolution(root_points, basis_distribution);

                if (!chain){
                    this.addSolutionText(`<h3 style="color:red">Ошибка построения цикла перераспределения ресурсов. Дальнейшее решение невозможно. </h3>`);
                    return;
                }

                this.optimizeSolution(basis_distribution, chain);
            }

            this.resetPotentials();

            if (i == MAX_ITERATIONS_COUNT-1){
                this.addSolutionText(`<h2 style="color:red">Количество итераций расчета превысило максимальное значение. 
                Возможно решение задачи зациклилось.</h2>`);
            }
        }
    }

    optimizeSolution(distribution, chain) {

        // Второй элемент берем как минимальный
        let min = distribution[ chain[1].i ][ chain[1].j ];

        // Выполняем поиск минимума
        chain.forEach((item, i) => {
            if (i == 0) return;

            if ( (distribution[ item.i ][ item.j ] !== '-') ) {

                if (i % 2 !== 0){
                    if (distribution[ item.i ][ item.j ] < min) {
                        min = distribution[ item.i ][ item.j ];
                    }
                }
            }
        });
        console.log(`Min = ${min}`);

        // Производим оптимизацию.
        for (let i = 0; i < chain.length; i++) {
            if (distribution[chain[i].i][chain[i].j] !== '-') {
                if (i % 2 === 0) {
                    distribution[chain[i].i][chain[i].j] += min;
                } else {
                    distribution[chain[i].i][chain[i].j] -= min;
                }

                // Удаляем из базиса ячейку с нулевой перевозкой.
                if (distribution[chain[i].i][chain[i].j] == 0){
                    distribution[chain[i].i][chain[i].j] = '-';
                }

            } else {
                distribution[chain[i].i][chain[i].j] = min;
            }
        }

        // Подсчет значения целевой функции.
        let sum = 0;
        for (let i = 0; i < PROVIDERS_COUNT; i++) {
            for (let j = 0; j < CONSUMERS_COUNT; j++) {
                if (distribution[i][j] !== '-') {
                    sum += distribution[i][j] * this.prices[i][j];
                }
            }
        }

        console.log(distribution);
        console.log(this.prices);

        this.addSolutionText(`<br><br>`);

        this.addSolutionText(`Цикл оптимизации: `);
        this.addSolutionText(`[${chain[0].i}][${chain[0].j}] (+${min})`);
        for (let i = 1; i < chain.length; i++) {
            if (i % 2 == 0) {
                this.addSolutionText(` => [${chain[i].i}][${chain[i].j}] (+${min})`);
            } else {
                this.addSolutionText(` => [${chain[i].i}][${chain[i].j}] (-${min})`);
            }
        }

        this.addSolutionText(this.createSolutionTable(distribution));
        this.addSolutionText(`Стоимость перевозок после оптимизации равна <b>${sum}</b>.`);

    }

    getChainForOptimizeSolution(root_points, distribution) {
        function isCorrectChain(chain){

            for (let i = 0; i < PROVIDERS_COUNT; i++){
                let count_by_current_index = 0;
                chain.forEach(function (item) {
                    if (item.i == i){
                        count_by_current_index++;
                    }
                });

                if (count_by_current_index % 2 !== 0)
                    return false;
            }

            for (let j = 0; j < PROVIDERS_COUNT; j++){
                let count_by_current_index = 0;
                chain.forEach(function (item) {
                    if (item.j == j){
                        count_by_current_index++;
                    }
                });

                if (count_by_current_index % 2 !== 0)
                    return false;
            }

            return true;
        }

        function findPointHorizontal(chain) {
            let firstElem = chain[0],
                lastElem = chain[chain.length - 1],
                i = lastElem.i,
                points = [];

            // Производим поиск точки по строке.
            for (let j = 0; j < CONSUMERS_COUNT; j++) {

                if ((distribution[i][j] !== '-') && (distribution[i][j] != '0')) {
                    // Нашли точку, проверяем что ее не было в цепи
                    let found = false;
                    for (let ind = 1; ind < chain.length; ind++) {
                        if (chain[ind].i == i && chain[ind].j == j) {
                            found = true;
                        }
                    }

                    // Если не нашли точку в цепи, то берем ее
                    if (!found) {
                        points.push(new Point(i, j, distribution[i][j]));
                    }

                }

                // Для четных элементов цепи можно выбирать нулевые точки.
                if (chain.length % 2 == 0){
                    // Нашли точку, проверяем что ее не было в цепи
                    let found = false;
                    for (let ind = 1; ind < chain.length; ind++) {
                        if (chain[ind].i == i && chain[ind].j == j) {
                            found = true;
                        }
                    }

                    // Если не нашли точку в цепи, то берем ее
                    if (!found) {
                        points.push(new Point(i, j, distribution[i][j]));
                    }
                }

                // Если цепь достаточно большая чтобы вернуться к вершине и она найдена
                if (chain.length > 3){
                    if (firstElem.i == i && firstElem.j == j){

                        if (isCorrectChain(chain)){
                            return chain;
                        } else{
                            return false;
                        }

                    }
                }
            }

            points.sort(function (a, b){
                let delta_a = Math.abs(lastElem.j - a.j),
                    delta_b = Math.abs(lastElem.j - b.j);

                if (delta_a > delta_b)
                    return 1;

                if (delta_a < delta_b)
                    return -1;
            });


            // Если в ходе поиска по строке была найдена хотя бы одна точка.
            if (points.length > 0) {
                let results        = [];
                let shortest_chain = false;

                // Запускаем поиск дальше по всем найденным точкам.
                for (let i = 0; i < points.length; i++) {
                    let chain_tmp = chain.slice(0, chain.length);
                    chain_tmp.push(points[i]);

                    results.push( findPointVertical(chain_tmp) );
                }

                // Нахождение самой короткой из найденных цепей.
                for (let i = 0; i < results.length; i++){
                    if (results[i] !== false){

                        if (!shortest_chain)
                            shortest_chain = results[i];

                        if (shortest_chain.length > results[i].length)
                            shortest_chain = results[i];
                    }
                }

                return shortest_chain;

            } else {
                return false;
            }
        }

        function findPointVertical(chain) {
            let firstElem = chain[0],
                lastElem = chain[chain.length - 1],
                j = lastElem.j,
                points = [];

            for (let i = 0; i < PROVIDERS_COUNT; i++) {

                if ((distribution[i][j] !== '-') && (distribution[i][j] != '0')) {
                    // Нашли точку, проверяем что ее не было в цепи
                    let found = false;
                    for (let ind = 1; ind < chain.length; ind++) {
                        if (chain[ind].i == i && chain[ind].j == j) {
                            found = true;
                        }
                    }

                    // Если не нашли точку в цепи, то берем ее
                    if (!found) {
                        points.push(new Point(i, j, distribution[i][j]));
                    }
                }

                // Для четных элементов цепи можно выбирать нулевые точки.
                if (chain.length % 2 == 0){
                    // Нашли точку, проверяем что ее не было в цепи
                    let found = false;
                    for (let ind = 1; ind < chain.length; ind++) {
                        if (chain[ind].i == i && chain[ind].j == j) {
                            found = true;
                        }
                    }

                    // Если не нашли точку в цепи, то берем ее
                    if (!found) {
                        points.push(new Point(i, j, distribution[i][j]));
                    }
                }

                // Если цепь достаточно большая чтобы вернуться к вершине и она найдена
                if (chain.length > 3){
                    if (firstElem.i == i && firstElem.j == j){
                        if (isCorrectChain(chain)){
                            return chain;
                        } else{
                            return false;
                        }
                    }
                }
            }


            points.sort(function (a, b){
                let delta_a = Math.abs(lastElem.i - a.i),
                    delta_b = Math.abs(lastElem.i - b.i);

                if (delta_a > delta_b)
                    return 1;

                if (delta_a < delta_b)
                    return -1;
            });

            // Если в ходе поиска по столбцу была найдена хотя бы одна точка.
            if (points.length > 0) {
                let results = [];
                let shortest_chain = false;

                // Запуск поиска дальше.
                for (let i = 0; i < points.length; i++) {
                    let chain_tmp = chain.slice(0, chain.length);
                    chain_tmp.push(points[i]);

                    results.push( findPointHorizontal(chain_tmp) );
                }

                // Нахождение самой короткой из найденных цепей.
                for (let i = 0; i < results.length; i++){
                    if (results[i] !== false){

                        if (!shortest_chain)
                            shortest_chain = results[i];

                        if (shortest_chain.length > results[i].length)
                            shortest_chain = results[i];
                    }
                }

                return shortest_chain;

            } else {
                return false;
            }
        }

        for (let i = 0; i < root_points.length; i++){

            console.log(`Trying to find chain with vertex in [${root_points[i].i}][${root_points[i].j}]`);

            let chain_start_h = [ root_points[i] ],
                chain_start_v = [ root_points[i] ];

            // Ищем цепи начиная по вертикали и горизонтали.
            let chain_h = findPointHorizontal(chain_start_h);
            let chain_v = findPointVertical(chain_start_v);

            if (chain_h && chain_v){

                if (chain_h.length > chain_v.length){
                    return chain_v;

                } else
                    return chain_h;

            } else {

                if (chain_h)
                    return chain_h;

                if (chain_v)
                    return chain_v;
            }

            console.log(`[x] Finding a chain by vertex in[${root_points[i].i}][${root_points[i].j}] failed.`);
        }

        console.log(` [x] No chains has been found. `);
        return false;
    }

    checkSolution(distribution) {
        let rating = 0;
        let root_points = [];

        for (let i = 0; i < PROVIDERS_COUNT; i++) {
            for (let j = 0; j < CONSUMERS_COUNT; j++) {
                if (distribution[i][j] === '-') {
                    rating = this.prices[i][j] - this.providers[i].potential - this.consumers[j].potential;

                    if (rating < 0)
                        root_points.push( new Point(i, j, rating));

                }
            }
        }

        root_points.sort( function (a, b) {
            if (a.value > b.value)
                return 1;

            if (a.value < b.value)
                return -1;
        });

        console.log(root_points);

        return root_points;
    }

    checkPotentials(distribution) {
        let prices     =  this.prices;
        let providers  =  this.providers;
        let consumers  =  this.consumers;

        // Функция выводит список потенциалов поставщиков и потребителей.
        function createPotentialsTable() {
            let string = '';
            string += `<br><b>Вычислены потенциалы поставщиков и потребителей.</b>`;
            string += `<table><tr><td>Поставщики:<ul>`;
            this.providers.forEach((item, i) => {
                string += `<li>A${i} => ${item.potential};</li>`;
            });
            string += `</ul></td>`;

            string += `<td>Потребители:<ul>`;
            this.consumers.forEach((item, i) => {
                string += `<li>B${i} => ${item.potential};</li>`;
            });
            string += `</ul></td></tr></table>`;
            return string;
        }

        // Подсчитывает и корректирует количество базисных точек.
        function checkAndRecalculateBasis(distribution) {
            let sum_basis = 0;
            let need_to_add_points = 0;

            // Обнуление точек с нулевыми перевозками
            for (let i = 0; i < PROVIDERS_COUNT; i++) {
                for (let j = 0; j < CONSUMERS_COUNT; j++) {
                    if (distribution[i][j] == 0) {
                        distribution[i][j] = '-';
                    }
                }
            }

            // Подсчет количества базисных точек.
            for (let i = 0; i < PROVIDERS_COUNT; i++) {
                for (let j = 0; j < CONSUMERS_COUNT; j++) {
                    if (typeof(distribution[i][j]) == 'number')
                        sum_basis++;
                }
            }

            // Проверка плана на вырожденность.
            if (sum_basis >= (CONSUMERS_COUNT + PROVIDERS_COUNT - 1)) {
                this.addSolutionText(`<br>План является невырожденным. Дальнейшее решение возможно без введения дополнительных ячеек в базис.`);
            } else {
                need_to_add_points = CONSUMERS_COUNT + PROVIDERS_COUNT - 1 - sum_basis;
                this.addSolutionText(`<br>План вырожденный. Необходимо добавить ${need_to_add_points} ячеек в базис.`);
            }

            console.log(`Adding ${need_to_add_points} points to basis.`);

            while(need_to_add_points > 0){
                let i = (Math.round(Math.random() * 1000) % (PROVIDERS_COUNT-1)) ;
                let j = (Math.round(Math.random() * 1000) % (CONSUMERS_COUNT-1)) ;

                if (distribution[i][j] == '-'){
                    if ( distribution[i+1][j]   !== '-' ||
                         distribution[i+1][j+1] !== '-' ||
                         distribution[i][j+1]   !== '-'  )
                    {
                        distribution[i][j] = 0;
                        need_to_add_points--;
                        this.addSolutionText(`<br>Добавлена точка  [${i}][${j}] в базис.`);
                    }
                }
            }
        }

        function calcConsumersPotentials(provider_index){
            let i = provider_index;
            let need_to_calc = [];

            // Подсчет потенциалов пользователей.
            for (let j = 0; j < CONSUMERS_COUNT; j++){

                if (distribution[i][j] !== '-'){

                    if (consumers[j].potential == undefined){
                        consumers[j].potential = prices[i][j] - providers[i].potential;
                        need_to_calc.push(j);
                    }

                }

            }

            need_to_calc.forEach(function(item){
                calcProvidersPotentials(item);
            });
        }

        function calcProvidersPotentials(consumer_index){
            let j = consumer_index;
            let need_to_calc = [];

            for (let i = 0; i < PROVIDERS_COUNT; i++){

                if (distribution[i][j] !== '-'){

                    if (providers[i].potential == undefined){
                        providers[i].potential = prices[i][j] - consumers[j].potential;
                        need_to_calc.push(i);
                    }

                }
            }

            need_to_calc.forEach(function(item){
                calcConsumersPotentials(item);
            });
        }

        // Корректировка количества базисных точек.
        checkAndRecalculateBasis.call(this, distribution);

        // Обнуляем потенциалы и вычисляем новые.
        this.resetPotentials();
        this.providers[0].potential = 0;
        calcConsumersPotentials(0, 10);

        this.addSolutionText(createPotentialsTable.call(this));
    }

    resetPotentials() {
        this.providers.forEach((item) => {
            item.potential = undefined;
        });

        this.consumers.forEach((item) => {
            item.potential = undefined;
        })
    }

    calculateNorthWestMethod() {
        this.addSolutionText(`<br><b>Расчет опорного плана методом северо-западного угла.<b> `);

        let needs_left = this.needs.slice(0, this.needs.length);
        let reserves_left = this.reserves.slice(0, this.reserves.length);
        let distribution = [];

        //Распределение резервов между потребителями.
        for (let i = 0; i < PROVIDERS_COUNT; i++) {
            distribution.push([]);
            for (let j = 0; j < CONSUMERS_COUNT; j++) {

                // Если резерв больше чем нужно, берем по нужде.
                if (needs_left[j] <= reserves_left[i]) {
                    distribution[i].push(needs_left[j]);

                    reserves_left[i] -= needs_left[j];
                    needs_left[j] = 0;
                } else

                //Если резерв меньше необходимого, берем сколько есть.
                if (needs_left[j] > reserves_left[i]) {
                    distribution[i].push(reserves_left[i]);

                    needs_left[j] -= reserves_left[i];
                    reserves_left[i] = 0;
                }

                //Заменяю пустые перевозки отсуствием перевозок.
                if (distribution[i][j] === 0) {
                    distribution[i][j] = `-`;
                }
            }
        }

        // Вычисление целевой функции.
        let sum = 0;
        for (let i = 0; i < PROVIDERS_COUNT; i++) {
            for (let j = 0; j < CONSUMERS_COUNT; j++) {
                if (typeof(distribution[i][j]) === 'number') {
                    sum += distribution[i][j] * this.prices[i][j];
                }
            }
        }

        this.addSolutionText(this.createSolutionTable(distribution));
        this.addSolutionText(`Сумма перевозок в опорном плате равна <b>${sum}</b>. `);

        return distribution;
    }

    createProvidersAndConsumers() {
        this.needs.forEach((item, i, arr) => {
            this.consumers.push(new Consumer(item, false));
        });

        this.reserves.forEach((item, i, arr) => {
            this.providers.push(new Provider(item, false));
        })
    }

    getTaskValues() {
        this.needs = [];
        this.prices = [];
        this.reserves = [];

        this.providers = [];
        this.consumers = [];

        let prices_inputs = createArrayFromNodeList(document.querySelectorAll(`input[id*='price']`));
        let reserve_inputs = createArrayFromNodeList(document.querySelectorAll(`input[id*='reserve']`));
        let needs_inputs = createArrayFromNodeList(document.querySelectorAll(`input[id*='need']`));

        // Получение значений цен для поставок в двумерный массив.
        for (let i = 0; i < PROVIDERS_COUNT; i++) {
            this.prices.push([]);
            for (let j = 0; j < CONSUMERS_COUNT; j++) {
                this.prices[i].push(prices_inputs[i * CONSUMERS_COUNT + j].value * 1);
            }
        }

        needs_inputs.forEach((item, i, arr) => {
            this.needs.push(item.value * 1);
        });

        reserve_inputs.forEach((item, i, arr) => {
            this.reserves.push(item.value * 1);
        });
    }

    checkAndSolveOpenTask() {
        function createFictitiousProvider(reserve) {
            this.providers.push(new Provider(reserve, true));
            PROVIDERS_COUNT++;

            this.prices.push([]);

            for (let i = 0; i < CONSUMERS_COUNT; i++) {
                this.prices[PROVIDERS_COUNT - 1].push(0);
            }

            this.reserves.push(reserve);
            this.addSolutionText(`<i>Необходимо добавить фиктивного поставщика <b>A${PROVIDERS_COUNT - 1}</b> с количеством резервов равным <b>${reserve}</b>.</i>`);
        }

        function createFictitiousConsumer(needs) {
            this.consumers.push(new Consumer(needs, true));
            CONSUMERS_COUNT++;

            this.prices.forEach((item) => {
                item.push(0);
            });

            this.needs.push(needs);
            this.addSolutionText(`<br><i>Необходимо добавить фиктивного потребителя 
                 <b>B${CONSUMERS_COUNT - 1}</b> с количеством потребностей равным <b>${needs}</b>.</i>`);
        }

        let sum_reserves = 0,
            sum_needs = 0;

        this.needs.forEach((item) => {
            sum_needs += item;
        });

        this.reserves.forEach((item) => {
            sum_reserves += item;
        });

        if (sum_needs == sum_reserves) {
            this.addSolutionText(`Транспортная задача закрытого типа. `);

        } else {
            this.addSolutionText(`Транспортная задача открытого типа. `);
            // Добавление фиктивного поставщика.
            if (sum_needs > sum_reserves) {
                createFictitiousProvider.call(this, sum_needs - sum_reserves);
            }

            // Добавление фиктивного потребителя
            if (sum_needs < sum_reserves) {
                createFictitiousConsumer.call(this, sum_reserves - sum_needs);
            }
        }

        this.addSolutionText(this.createSolutionTable());
    }

    createSolutionTable(distribution = null, potentials = null) {
        if (distribution === null) {
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
                if (this.consumers[i].isFictitious)
                    table_html += `<td class="fictitious">B${i}*</td>`;
                else
                    table_html += `<td>B${i}</td>`;
            }
            table_html += `</tr></thead>`;


            //Creating tbody part;
            table_html += `<tbody>`;

            for (let i = 0; i < PROVIDERS_COUNT; i++) {
                table_html += `<tr>`;

                if (this.providers[i].isFictitious) {
                    table_html += `<td class="fictitious">A${i}*</td>`;
                    table_html += `<td><p class="reserve fictitious">${this.providers[i].reserve}</p></td>`;
                } else {
                    table_html += `<td>A${i}</td>`;
                    table_html += `<td><p class="reserve">${this.providers[i].reserve}</p></td>`;
                }

                for (let j = 0; j < CONSUMERS_COUNT; j++) {
                    table_html += `<td><p class="consumer">${this.prices[i][j]}</p></td>`;
                }

                table_html += `</tr>`;
            }

            table_html += `<tr>
                        <td colspan="2">${NEEDS_LABEL}</td>
                    `;
            for (let i = 0; i < CONSUMERS_COUNT; i++) {
                if (this.consumers[i].isFictitious) {
                    table_html += `<td class="fictitious">${this.consumers[i].needs}</td>`;
                } else {
                    table_html += `<td>${this.consumers[i].needs}</td>`;
                }
            }

            table_html += `</tr></table>`;

            return table_html;
        }
        else {
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
                if (this.consumers[i].isFictitious)
                    table_html += `<td class="fictitious">B${i}*</td>`;
                else
                    table_html += `<td>B${i}</td>`;
            }
            table_html += `</tr></thead>`;


            //Creating tbody part;
            table_html += `<tbody>`;

            for (let i = 0; i < PROVIDERS_COUNT; i++) {
                table_html += `<tr>`;

                if (this.providers[i].isFictitious) {
                    table_html += `<td class="fictitious">A${i}*</td>`;
                    table_html += `<td><p class="reserve fictitious">${this.providers[i].reserve}</p></td>`;
                } else {
                    table_html += `<td>A${i}</td>`;
                    table_html += `<td><p class="reserve">${this.providers[i].reserve}</p></td>`;
                }

                for (let j = 0; j < CONSUMERS_COUNT; j++) {
                    table_html += `<td><p class="consumer">${distribution[i][j]}</p></td>`;
                }

                table_html += `</tr>`;
            }

            table_html += `<tr>
                        <td colspan="2">${NEEDS_LABEL}</td>
                    `;
            for (let i = 0; i < CONSUMERS_COUNT; i++) {
                if (this.consumers[i].isFictitious) {
                    table_html += `<td class="fictitious">${this.consumers[i].needs}</td>`;
                } else {
                    table_html += `<td>${this.consumers[i].needs}</td>`;
                }
            }

            table_html += `</tr></table>`;

            return table_html;
        }
    }

    createTable(){
        this.solutionDiv.innerHTML = ' ';

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
                table_html += `<td><input type="text" id="price_${i}${j}"></td>`;
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


        this.taskDiv.innerHTML = table_html;
    }

    addSolutionText(text) {
        this.solutionDiv.innerHTML += text;
    }

}



function main () {
    let ts = new TransportTask();

    document.getElementById('consumers-count').value = CONSUMERS_COUNT;
    document.getElementById('providers-count').value = PROVIDERS_COUNT;

    document.getElementById('create-table').onclick = function () {
        let consumers_count = document.getElementById('consumers-count').value * 1;
        let providers_count = document.getElementById('providers-count').value * 1;

        console.log(`PRC=${providers_count} CNC=${consumers_count}`);

        if (consumers_count > 1 && providers_count > 1){
            PROVIDERS_COUNT = providers_count;
            CONSUMERS_COUNT = consumers_count;
        }

        ts.createTable();

    }

    document.getElementById('calculate-task').onclick = function (){
        ts.solveTheTask();
    }
}

main();




class Provider {
    constructor(reserve, isFictitious = false) {
        this.reserve = reserve;
        this.isFictitious = isFictitious;
        this.potential = undefined;
    }
}

class Consumer {
    constructor(needs, isFictitious = false) {
        this.needs = needs;
        this.isFictitious = isFictitious;
        this.potential = undefined;
    }
}

class Point {
    constructor(i, j, value) {
        this.i = i;
        this.j = j;
        this.value = value;
    }
}