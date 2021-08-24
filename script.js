var _scannerIsRunning = false;

// Récupération des éléments HTML

const camera_pause = document.getElementById('camera_pause');
const camera_restart_button = document.getElementById('camera_restart');


const progressbar_div = document.getElementById('progressbar');
const progressbar_container = document.getElementById('progressbar_container');
const boxes_progressbar_div = document.getElementById('boxes_progressbar');
const suitcases_progressbar_div = document.getElementById('suitcases_progressbar');

const result_div = document.getElementById("result_div");
const result_text = document.getElementById("result");
const barcode_actions_div = document.getElementById("barcode_actions");


const progress_detail_div = document.getElementById('progress_detail');


const description_div = document.getElementById("description");
const search_bar = document.getElementById("search_bar");
const search_input = search_bar.getElementsByTagName('input')[0];

const new_scan_button = document.getElementById("unpause_button");
const info_button = document.getElementById("info_button");
const search_button = document.getElementById("search_button");
const search_validate_button = document.getElementById('search_validate_button');

const reset_button = document.getElementById("reset_button");
const reset_div = document.getElementById('reset_div');
const validate_reset_button = document.getElementById('validate_reset');
const abort_reset_button = document.getElementById('abort_reset');

const close_buttons = document.querySelectorAll('.close_button');

const info_canvas = document.getElementsByTagName('aside')[0];

const progress_switch_radios = document.querySelectorAll('input[name="progress_view"');

const global_progress = document.querySelector('#global_progressbar .progressbar_progress');
const global_percent = document.querySelector('#global_progressbar .progressbar_percentage');

const camera_width = 720;
const camera_height = 720;

var camera_timeout;
const timeout = 300000; //temps d'attente avant mise en pause en ms

function startScanner() {

    // Initialisation du module Quagga pour la lecture des codes barres
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#camera_feed'),
            constraints: {
                width: camera_width ,
                height: camera_height,
                facingMode: "environment",
            },
        },
        decoder: {
            readers: [
                "code_128_reader",
            ],
            multiple: false,
            debug: {
                showFoundPatches: true,
                showSkeleton: true,
                showLabels: true,
                showPatchLabels: true,
                showRemainingPatchLabels: true,
                boxFromPatches: {
                    showTransformed: true,
                    showTransformedBox: true,
                    showBB: true
                }
            }
        },

    }, function (err) {
        if (err) {
            console.log(err);
            return
        }

        Quagga.start();
        
        camera_timeout = window.setTimeout(function(){pauseCamera()},timeout);       

        // Set flag to is running
        _scannerIsRunning = true;
    });


    // Action quand un code barre est détecté 
    Quagga.onDetected(function (result) {

        // Remise a zero du timeout
        window.clearTimeout(camera_timeout);
        timeoutHandle = window.setTimeout(function(){pauseCamera()},timeout);

        var barcode = result.codeResult.code;

        handleBarcode(barcode);
               
        Quagga.pause();
    });
}

function handleBarcode(barcode, auto = 0){
    
    result_text.innerHTML = barcode;
    barcode_actions_div.innerHTML = '<h2>Répartition : </h2>';

    closeInfoArea();

    var element, type;

    if(barcode_list['bag'][barcode]){
        element = barcode_list['bag'][barcode];
        type = 'suitcases';
    }else if(barcode_list['part'][barcode]){
        element = barcode_list['part'][barcode];
        type = 'boxes';
    }else{
        element = null;
        type = '';
    }

    if(element){
      
        description_div.innerHTML = element['qty'] + ' x ' + element['description'];
        description_div.style.color = 'black'
    
        for (var key in element['distribution']){
    
            if(element['distribution'][key]!=0){
                addActionLine(key, element['code_element'], element['distribution'][key],type);
            }
    
        }   
        new_scan_button.innerHTML = 'Valider';

    } else {
      
        description_div.innerHTML = "Code barre inconnu";
        description_div.style.color = 'red'
        new_scan_button.innerHTML = 'Nouveau scan';
    
    }

    if(auto){
    
        Array.prototype.forEach.call(document.querySelectorAll('.actionLine input[type="checkbox"]'), function(el) {
            el.checked = 1;
        });
        new_scan_button.click();
    
    }else{

        result_div.classList.remove('hidden');

    }

}

// Fonction pour ajouter une ligne de répartition
function addActionLine(box,element,quantity,type){

    var action_line = document.createElement("div");
    action_line.classList.add('actionLine');
    action_line.setAttribute('data-container', box);
    action_line.setAttribute('data-type', type);
    action_line.setAttribute('data-element', element);
    action_line.setAttribute('data-quantity', quantity);
    action_line.innerHTML = box  + ' &#8594; ' + quantity +' unités' ;

    var action_switch = document.createElement("label");
    action_switch.classList.add('switch');
    action_switch.innerHTML = `
        <input type="checkbox">
        <span class="slider round"></span>`;
    action_line.appendChild(action_switch);
    document.getElementById("barcode_actions").appendChild(action_line);
}

// Fonction pour gérer les boutons de répartition
function validateDistribution() {
    
    Array.prototype.forEach.call(document.querySelectorAll('.actionLine input[type="checkbox"]'), function(checkbox) {

        if(checkbox.checked == 1){
            const location = checkbox.parentNode.parentNode.getAttribute('data-container'); 
            const element = checkbox.parentNode.parentNode.getAttribute('data-element'); 
            const quantity = checkbox.parentNode.parentNode.getAttribute('data-quantity'); 
            
            const container = checkbox.parentNode.parentNode.getAttribute('data-type');
            loc_list_progress[container][location][element]+=parseInt(quantity);


        }
    });

    update_progress();
}

// Fonction pour mettre à jour toutes les infos de progression
function update_progress(){

    var total = 0;
    var progress = 0;

    for(bc_type in barcode_type){
        const container = barcode_type[bc_type]

        for (const location in loc_list[container]){
            var qty = 0;
            var qty_progress = 0;

            const progress_span = document.querySelector('span[data-id ="progress_'+ location + '"]');
            const progress_bar = document.querySelector('progress[data-id ="progress_bar_'+ location + '"]');

            for(element in loc_list_progress[container][location]){

                qty_progress += Math.min(loc_list_progress[container][location][element],loc_list[container][location][element]);
                qty += loc_list_progress[container][location][element];

                if(loc_list_progress[container][location][element] == loc_list[container][location][element]){
                    document.querySelector('div[data-id = "progress_detail_' + location + '_' + element + '"]').classList.add('full');
                }else if(loc_list_progress[container][location][element] >= loc_list[container][location][element]){
                    document.querySelector('div[data-id = "progress_detail_' + location + '_' + element + '"]').classList.add('error');
                    document.querySelector('.progress_line[data-container="'+ location + '"]').style.color = 'red';

                }

                document.querySelector('div[data-id = "progress_detail_' + location + '_' + element + '"] span').innerHTML = loc_list_progress[container][location][element];

            }

            progress += qty_progress;
            total += loc_list[container][location]['total'];

            progress_span.innerHTML = qty + '/'+loc_list[container][location]['total'];
            progress_bar.setAttribute('value',qty);

        }

    }
   

    global_progress.style.width = 100*progress/total + '%';
    global_percent.innerHTML = Math.round(100*progress/total) + '%'
}

// Focntion pour relancer le scan de code barre
function resetScanner(){
    
    if(_scannerIsRunning){
        Quagga.start();
    }

    Array.prototype.forEach.call(document.getElementsByClassName('actionLine'), function(el) {
        el.remove();
    });

    document.getElementById("result_div").classList.add('hidden');
}

// Fonction pour afficher les details des valisettes dans la fenetre d'infos
function showDetail() {

    progress_detail_div.classList.remove('hidden');

    for(bc_type in barcode_type){
        const container = barcode_type[bc_type]

        for( const location in loc_list[container]){
            document.querySelector('div[data-id="progress_detail_' + location +'"]').classList.add('hidden');
        }

    }

    const id = this.parentNode.getAttribute('data-container');
    document.querySelector('div[data-id="progress_detail_'+ id + '"]').classList.remove('hidden');
    
    
}


// Fonction de gestion de l'ouverture de la zone d'information
function closeInfoArea(){

    if(_scannerIsRunning){
        Quagga.start();
    }

    info_button.innerHTML = 'i'
    info_canvas.classList.add('hidden');
    progress_detail_div.classList.add('hidden');
    info_button.classList.remove('open');

}

function openInfoArea(){

    Quagga.pause();
    info_button.innerHTML = 'X';
    for(bc_type in barcode_type){
        const container = barcode_type[bc_type]
        for( const location in loc_list[container]){
            document.querySelector('div[data-id= "progress_detail_' + location + '"]').classList.add('hidden');
        }
    }
    info_canvas.classList.remove('hidden');
    progress_detail_div.classList.remove('hidden');
    info_button.classList.add('open');

}

// Fonction de pause de la camera
function pauseCamera(){
    Quagga.stop();
    _scannerIsRunning = false;
    camera_pause.classList.remove('hidden')
}

function resumeCamera(){
    startScanner();
    camera_pause.classList.add('hidden')
}

// Event listeners pour les bouttons

new_scan_button.addEventListener("click", function () {
  
    validateDistribution();

    resetScanner();

}, false);

info_button.addEventListener("click", function () {

    if(info_button.classList.contains('open')){
        closeInfoArea();
    }else{
        openInfoArea();
    }

    document.getElementById('progress_detail').classList.add('hidden');

}, false);

search_button.addEventListener("click", function(){
    search_bar.classList.remove('hidden');
    search_input.focus();
}, false)

search_validate_button.addEventListener("click",function(){
    handleBarcode(search_input.value.toUpperCase());
    search_input.value = '';
    search_bar.classList.add('hidden');
},false)

reset_button.addEventListener('click',function(){
    reset_div.classList.remove('hidden');
}, false)

validate_reset_button.addEventListener("click", function () {

    for(bc_type in barcode_type){
        const container = barcode_type[bc_type]
        for(const location in loc_list_progress[container]){
            for(element in loc_list_progress[container][location]){
                loc_list_progress[container][location][element]=0;
            }
        }
    }

    Array.prototype.forEach.call(document.querySelectorAll('.progress_line'), function(el){
        el.style.color = null;
    });


    Array.prototype.forEach.call(document.querySelectorAll('.progress_detail_line'), function(el){
        el.style.color = null;
    });

    update_progress();
    reset_div.classList.add('hidden');
    
}, false);

abort_reset_button.addEventListener("click", function () {
    reset_div.classList.add('hidden');
}, false);


close_buttons.forEach((button) => {
    button.addEventListener('click', function(){
        this.parentNode.classList.add('hidden');
        }, false)
    }
);

progress_switch_radios.forEach(radio => {
    radio.addEventListener('change',function(e){
        progress_detail_div.classList.add('hidden');
        if(e.target.id == 'option-2'){
            progressbar_container.style.left = '-100%';
        }else{
            progressbar_container.style.left = '0%';
        }
    })
});

camera_restart_button.addEventListener('click',function(){
    resumeCamera();
})




// Fonction de récuperation des données dans les fichiers csv
const getCSVCases = new Promise((resolve,reject) =>{
    fetch('cases.csv', {method: 'get'})
            .then(response => {
                response.text()
                .then(text => {
                    csvToObject(text,bag_list);
                    resolve(2);
                });
            })
            .catch(err => {
                console.log('Erreur de chargement du fichier cases.csv : ', err);
                reject(0);
                }
            )
});

const getCSVBoxes = new Promise((resolve,reject) =>{
    fetch('boxes.csv', {method: 'get'})
            .then(response => {
                response.text()
                .then(text => {
                    csvToObject(text,part_list);
                    resolve(2);
                });
            })
            .catch(err => {
                console.log('Erreur de chargement du fichier boxes.csv : ', err);
                reject(0);
                }
            )
});

function csvToObject(csv, object){

    const csv_lines = csv.trim().split(/\r?\n/);

    const header = csv_lines[0].split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).slice(1,4);
    const header2 = csv_lines[0].split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).slice(4);
    let unknown_count = 1;

    for (var i = 1; i < csv_lines.length; i++){
        var data = csv_lines[i].split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/);
        
        for(j=0; j<data.length; j++){
            data[j] = data[j].replace(/^\"|\"$/g,'');
        }

        if(data[0] != ''){

            object[data[0]] = header.reduce((r,e,i) => (r[e] = data[i+1], r), {});
            object[data[0]]['distribution'] = header2.reduce((r,e,i) => (r[e] = data[i+4], r), {});
        
        }else{

            object['sansCodeBarre' + unknown_count] = header.reduce((r,e,i) => (r[e] = data[i+1], r), {});
            object['sansCodeBarre' + unknown_count]['distribution'] = header2.reduce((r,e,i) => (r[e] = data[i+4], r), {});
        
            if( object['sansCodeBarre' + unknown_count]['code_element'] == "" ){
                object['sansCodeBarre' + unknown_count]['code_element'] = 'sansCodeBarre' + unknown_count;
            }
            
            unknown_count = unknown_count + 1;
        
        }
        
    }

}


// Fonction d'initialisation et de lancement de l'application
function startApp(){

    startScanner();


    /////////////////////////////////////
    // Création des variables de suivi //
    /////////////////////////////////////
    // barcode_list = liste des codes barres, extraite des fichiers CSV injecté via PHP
    // loc_list = liste des emplacement de stockage avec le nombre d'element objectif
    // loc_list_progress = liste des valisettes avec le nombre d'element en cours


    // Types de code barre et type de rangement associé

    barcode_type['bag'] = 'suitcases';
    barcode_type['part'] = 'boxes';


    barcode_list['bag'] = bag_list;
    barcode_list['part'] = part_list; 


    progressbar_divs['suitcases'] = suitcases_progressbar_div;
    progressbar_divs['boxes'] = boxes_progressbar_div;




    // Création des objets valisette et caisses à partir de la liste des codes barre

    for(bc_type in barcode_type){

        const container = barcode_type[bc_type]
        loc_list[container] = new Object;
        loc_list_progress[container] = new Object;

        element_description_index = new Object;

        for (const barcode in barcode_list[bc_type]){

            var item = barcode_list[bc_type][barcode]['code_element']; //code de l'element lié au code barre
            var item_description = barcode_list[bc_type][barcode]['description']; //description de l'element
            var qty = barcode_list[bc_type][barcode]['qty']; // Quantite d'element
            var sum = 0; // Variable de verification de la distribution
            

            if( !(item in element_description_index) ){
                element_description_index[item] = item_description;
            }
            
            for (const location in barcode_list[bc_type][barcode]['distribution']){ // Parcours de la distribution par rangement pour le codebarre en cours

                var location_qty = barcode_list[bc_type][barcode]['distribution'][location]!='' ? parseInt(barcode_list[bc_type][barcode]['distribution'][location]) : 0; // On transforme les cases vides en 0
                
                //Creation des differents rangement (valisette ou caisse) dans leur liste respective
                if (!(location in loc_list[container])){
                    loc_list[container][location]=new Object;
                    loc_list_progress[container][location]=new Object;
                }
                
                //Ajout de l'element dans le rangement en question
                if(location_qty!=0){

                    sum += location_qty;

                    loc_list_progress[container][location][item] = 0;

                    if(item in loc_list[container][location]){
                        loc_list[container][location][item] += location_qty;
                    } else {
                        loc_list[container][location][item] = location_qty;
                    }

                }

            }

            //Si sum (nb d'element dans la distrib) pas egal a qty (nb d'element dans le sachet) => erreur dans la distribution
            if(sum != qty){
                console.log('Erreur dans le fichier de distribution (code barre ' + barcode + ')');
            }

        }

    // Création de l'interface de suivi de la progression

    for (position in loc_list[container]){

        // Création des fenetres de détail par valisette

        var total = 0;

        var progress_detail = document.createElement('div');
        progress_detail.classList.add('hidden');
        progress_detail.classList.add('progress_detail_wrapper');
        progress_detail.setAttribute('data-id', 'progress_detail_'+position);
        progress_detail.innerHTML = '<h2>' + position + '</h2>';

        var progress_detail_container = document.createElement('div');
        progress_detail_container.classList.add('progress_detail_container');

        for(element in loc_list[container][position]){ //parcours des elements dans la valisette

            total += loc_list[container][position][element];

            element_description  = element_description_index[element];

            //Creation d'une ligne de détail par element
            var progress_detail_element = document.createElement('div');
            progress_detail_element.classList.add('progress_detail_line');
            progress_detail_element.setAttribute('data-id' , 'progress_detail_' + position + '_' + element);
            progress_detail_element .innerHTML = element_description + ' : <span>0</span>/' + loc_list[container][position][element];
            progress_detail_container.appendChild(progress_detail_element);

        }

        loc_list[container][position]['total'] = total; // Nombre total d'element dans la valisette
        progress_detail.appendChild(progress_detail_container);
        progress_detail_div.appendChild(progress_detail);

        // Création de la zone d'affichage generale

        var progress_line = document.createElement('div');
        progress_line.setAttribute('data-container',position);
        progress_line.setAttribute('data-type',container);
        progress_line.classList.add('progress_line');

        var title = document.createElement('span');
        title.innerHTML = position + ' : '
        progress_line.appendChild(title);

        var progressbar = document.createElement('progress');
        progressbar.setAttribute('data-id','progress_bar_'+position);
        progressbar.setAttribute('value',0);
        progressbar.setAttribute('max',loc_list[container][position]['total']);
        progress_line.appendChild(progressbar);

        var progress = document.createElement('span');
        progress.setAttribute('data-id' , 'progress_'+position);
        progress.innerHTML = '0 /'+loc_list[container][position]['total']
        progress_line.appendChild(progress);

        var progress_detail_button = document.createElement('button')
        progress_detail_button.innerHTML ='i';
        progress_detail_button.onclick = showDetail;
        progress_line.appendChild(progress_detail_button);

        progressbar_divs[container].appendChild(progress_line);

    }

    }

}



barcode_type = new Object;
barcode_list = new Object;
progressbar_divs = new Object;

loc_list = new Object;
loc_list_progress = new Object;

bag_list = new Object;
part_list = new Object;

Promise.all( [getCSVCases,getCSVBoxes]).then( () => {
    startApp();
})


// TODO : 
// Piece sans code barre
