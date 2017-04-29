function createArrayFromNodeList(nodeList) {
    let arr = [];
    for (let i = nodeList.length; i--; arr.unshift(nodeList[i]));

    return arr;
}

const PROVIDERS_LABEL = 'Поставщики';
const RESERVE_LABEL = 'Запасы';
const CONSUMERS_LABEL = 'Потребители';
const NEEDS_LABEL = 'Потребности';

let PROVIDERS_COUNT = 3;
let CONSUMERS_COUNT = 3;

class TransportTask {

    constructor() {
        this.needs = [];
        this.prices = [];
        this.reserves = [];

        this.providers = [];
        this.consumers = [];

        this.taskDiv = document.getElementById('task');
        this.solutionDiv = document.getElementById('solution');

        this.getTaskValues();
        this.solveTheTask();
    }

    solveTheTask() {
        this.addSolutionText(`<hr><h3>Решение задачи</h3>`);
        this.createProvidersAndConsumers();
        this.checkAndSolveOpenTask();

        let basis_distribution = this.calculateNorthWestMethod();

        for (let i = 0; i < 10; i++) {
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

            // Если в ходе поиска по строке была найдена хотя бы одна точка.
            if (points.length > 0) {

                for (let i = 0; i < points.length; i++) {

                    // Если найдена конечная точка, возвращаем цепь.
                    /*if ((firstElem.i == points[i].i) && (firstElem.j == points[i].j) && chain.length > 3) {
                        return chain;
                    }*/

                    let chain_tmp = chain.slice(0, chain.length);
                    chain_tmp.push(points[i]);

                    let result = findPointVertical(chain_tmp);
                    if (result) {
                        return result;
                    }
                }

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

            // Если в ходе поиска по столбцу была найдена хотя бы одна точка,
            // продолжаем поиск по строкам.
            if (points.length > 0) {

                for (let i = 0; i < points.length; i++) {

                    // Если найдена конечная точка, возвращаем цепь.
                    /*if ((firstElem.i == points[i].i) && (firstElem.j == points[i].j) && chain.length > 3) {
                        return chain;
                    }*/

                    let chain_tmp = chain.slice(0, chain.length);
                    chain_tmp.push(points[i]);

                    let result = findPointHorizontal(chain_tmp);
                    if (result) {
                        return result;
                    }
                }

            } else {
                return false;
            }
        }



        let chain = false;

        for (let i = 0; i < root_points.length; i++){

            console.log(`Trying to find chain with vertex in [${root_points[i].i}][${root_points[i].j}]`);

            let chain_start = [ root_points[i] ];

            // Пробуем начать поиск цепи по горизонтали.
            let chain = findPointHorizontal(chain_start);

            if (!chain) {
                // Если поиск по горизонтали не удался, ищем по вертикали.
                chain = findPointVertical(chain_start);
                console.log(`[x] Finding a chain by vertex in[${root_points[i].i}][${root_points[i].j}] failed.`);

            } else {
                console.log(chain);
                return chain;
            }
        }

        return chain;
    }

    checkSolution(distribution) {
        let rating = [];
        let root_points = [];

        for (let i = 0; i < PROVIDERS_COUNT; i++) {
            rating.push([]);
            for (let j = 0; j < CONSUMERS_COUNT; j++) {
                if (distribution[i][j] === '-') {
                    rating[i][j] = this.prices[i][j] - this.providers[i].potential - this.consumers[j].potential;

                    if (rating[i][j] < 0)
                        root_points.push( new Point(i, j, rating[i][j]));

                } else {
                    rating[i][j] = 0;
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

        // Функции для вычисления потенциалов потребителей и поставщиков.
        let prices    = this.prices;
        let providers = this.providers;
        let consumers = this.consumers;

        function calcConsumersPotentials(provider_index, counter){
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

            counter--;

            if (counter < 0)
                return;

            need_to_calc.forEach(function(item){
                calcProvidersPotentials(item, counter);
            });
        }

        function calcProvidersPotentials(consumer_index, counter){
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

            counter--;

            if (counter < 0)
                return;

            need_to_calc.forEach(function(item){
                calcConsumersPotentials(item, counter);
            });
        }


        var allPotentialsAreCalculated = true;

        // Корректировка количества базисных точек.
        checkAndRecalculateBasis.call(this, distribution);


        let potentialsAreCalculated = true;
        // Обнуляем потенциалы и вычисляем новые.
        // Первая попытка вычислить потенциалы из левого верхнего угла
        // при 0 потенциале у первого поставщика.
        this.resetPotentials();
        this.providers[0].potential = 0;
        calcConsumersPotentials(0, 5);

        /*for (let i = 0; i < PROVIDERS_COUNT; i++) {
            for (let j = 0; j < CONSUMERS_COUNT; j++) {
                if (distribution[i][j] !== '-') {

                    if ((this.consumers[j].potential === undefined) &&
                        (this.providers[i].potential !== undefined)) {
                        this.consumers[j].potential = this.prices[i][j] - this.providers[i].potential;
                    } else

                    if ((this.providers[i].potential === undefined) &&
                        (this.consumers[j].potential !== undefined)) {
                        this.providers[i].potential = this.prices[i][j] - this.consumers[j].potential;
                    } else

                    if ((this.providers[i].potential === undefined) &&
                        (this.consumers[j].potential === undefined)) {
                        console.log("Cant calculate potentials (1)");
                        console.log(i);
                        console.log(j);
                        potentialsAreCalculated  = false;
                    }
                }
            }
        }*/

        // Если при первой попытке не вышло рассчитать все потенциалы
        // пробуем рассчитать потенциалы из правого нижнего угла при 0 потенциале у последнего поставщика.
        if (!potentialsAreCalculated){
            console.log(`Second try to calculate potentials`);
            this.resetPotentials();
            this.providers[PROVIDERS_COUNT-1].potential = 0;
            for (let i = PROVIDERS_COUNT-1; i >= 0; i--) {
                for (let j = CONSUMERS_COUNT-1; j >= 0; j--) {
                    if (distribution[i][j] !== '-') {
                        if ((this.consumers[j].potential === undefined) &&
                            (this.providers[i].potential !== undefined)) {
                            this.consumers[j].potential = this.prices[i][j] - this.providers[i].potential;
                        } else

                        if ((this.providers[i].potential === undefined) &&
                            (this.consumers[j].potential !== undefined)) {
                            this.providers[i].potential = this.prices[i][j] - this.consumers[j].potential;
                        } else

                        if ((this.providers[i].potential === undefined) &&
                            (this.consumers[j].potential === undefined)) {
                            console.log("Cant calculate potentials (2)");
                            console.log(i);
                            console.log(j);
                        }
                    }
                }
            }
        }

        this.addSolutionText(createPotentialsTable.call(this));
    }

    resetPotentials() {
        this.providers.forEach((item) => {
            item.potential = undefined;
        });

        this.consumers.forEach((item) => {
            item.potential = undefined;
        })

        //this.providers[0].potential = 0;
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

        //checkAndRecalculateBasis.call(this, distribution);

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

    addSolutionText(text) {
        this.solutionDiv.innerHTML += text;
    }

}


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

let ts = new TransportTask();