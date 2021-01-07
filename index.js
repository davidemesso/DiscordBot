require('dotenv').config();
const Discord = require('discord.js');
const fetch = require("node-fetch"); 
const client = new Discord.Client();
const fs = require('fs');
const { exception } = require('console');

var arrigoQuotes;
fs.readFile('arrigoQuotes.json', 'utf-8', (err, data) => {
    if (err) 
        throw err;

    arrigoQuotes = JSON.parse(data.toString());
});

client.on('ready', _ => console.log(`Logged in as ${client.user.tag}!`));
client.on('message', msg => {
    if(msg.content.startsWith("!arrigo "))
        handleCommand(msg);
});

client.login(process.env.TOKEN);

const commandFunctions = {
    'ping' : (msg) => {if(checkParameters(msg, "ping")) replyWith(msg, "Pong!", true);},
    'help' : (msg) => {if(checkParameters(msg, "help")) sendHelp(msg);},
    'quote' : (msg) => {if(checkParameters(msg, "quote")) sendRandomQuote(msg);},
    'allQuotes' : (msg) => {if(checkParameters(msg, "allQuotes")) sendAllQuotes(msg);},
    'gif' : (msg) => {if(checkParameters(msg, "gif")) sendGif(msg);},
    'photo' : (msg) => {if(checkParameters(msg, "photo")) sendRandomImage(msg);},
    'addQuote' : addQuote,
    'removeQuote' : removeQuote,
    'playAudio' : playAudio,
    'printMatrix' : printMatrix,
    'det' : determinant,
    'transpose' : transpose,
    'inverse' : sendInverse,
    'rank' : rankOfMatrix ,
}

function handleCommand(msg)
{
    const command = msg.content.replace("!arrigo ", "").split(" ")[0];
    try
    {
        commandFunctions[command](msg);
    }
    catch 
    {
        replyWith(msg, "Comando non valido!", true);
    }   
}

const commandList = {
    "ping": "No parameters", 
    "help": "No parameters", 
    "quote": "No parameters", 
    "allQuotes": "No parameters", 
    "addQuote": "String : quote",
    "removeQuote": "Number : ID",
    "gif": "No parameters", 
    "photo": "No parameters",
    "playAudio": "Number : audio ID, [Number : volume]",
    "printMatrix": "JSON : matrix",
    "det": "JSON : matrix (sqare)",
    "transpose": "JSON : matrix (sqare)",
    "inverse": "JSON : matrix (sqare)",
    "rank": "JSON : matrix (sqare)",
}

function checkParameters(msg, command)
{
    if(msg.content.replace("!arrigo " + command, "") != "")
    {
        msg.channel.send("Troppi parametri!");
        return false;
    }
    return true;
}

function replyWith(trigger, message, tag = false)
{
    if(tag)
        trigger.reply(message);
    else
        trigger.channel.send(message);
}

function sendRandomQuote(trigger)
{
    const index = Math.floor(Math.random() * arrigoQuotes.length);
    replyWith(trigger, arrigoQuotes[index]);
}

async function sendGif(trigger)
{
    trigger.channel.send("", {files: ["https://media.giphy.com/media/fvywuOdycSZHJ0egV0/source.gif"]});
}

async function sendRandomImage(trigger)
{
    const picCount = 5;
    const index = Math.floor(1 + (Math.random() * (picCount - 1)));
    trigger.channel.send("", {files: [`./files/${index}.png`]});
}

function sendHelp(trigger)
{
    let manual = "\n\`\`\`JSON\nEvery command start with !arrigo\n\n";

    Object.keys(commandList).forEach((key) => 
        manual += `${key}: "${commandList[key]}"\n`
    );
    manual += "\`\`\`";
    replyWith(trigger, manual, true);
}

function sendAllQuotes(trigger)
{
    let formatMessage = " ";
    arrigoQuotes.forEach(function (quote, i) {
        formatMessage += `${i}: ${quote}\n`;
    });
    replyWith(trigger, formatMessage); 
}

function addQuote(trigger)
{
    const parameter = trigger.content.replace("!arrigo addQuote", "").trim();
    if(parameter == "")
    {
        replyWith(trigger, "Richiesto parametro! (frase da aggiungere)"); 
        return
    }

    arrigoQuotes.push(parameter);

    const data = JSON.stringify(arrigoQuotes);
    fs.writeFile('arrigoQuotes.json', data, (err) => {
        if (err) 
            throw err;
    });

    replyWith(trigger, `Frase aggiunta: ${parameter}`); 
}

function removeQuote(trigger)
{
    if (!trigger.member.roles.cache.some((role) => role.name === 'Gestore bot')) 
    {
        replyWith(trigger, "Serve il ruolo Gestore bot")
        return;
    }

    const parameter = trigger.content.replace("!arrigo removeQuote", "").trim();
    if(parameter == "")
    {
        replyWith(trigger, "Richiesto parametro! (ID frase da rimuovere)"); 
        return
    }

    let toRemove = arrigoQuotes[parameter];
    if(toRemove)
    {
        arrigoQuotes.splice(parameter, 1);

        const data = JSON.stringify(arrigoQuotes);
        fs.writeFile('arrigoQuotes.json', data, (err) => {
            if (err) 
                throw err;
        });
        replyWith(trigger, `Frase rimossa: ${toRemove}`); 
    }
    else 
        replyWith(trigger, `Parametro non valido`); 
}

function playAudio(trigger)
{
    const parameter = trigger.content.replace("!arrigo playAudio", "").trim().split(" ");
    const ID = parameter[0];
    let vol = parameter[1] > 5 ? 5 : parameter[1];
    if(parameter == "")
    {
        replyWith(trigger, "Richiesto parametro! (Id audio)"); 
        return
    }

    const VC = trigger.member.voice.channel;
    if (!VC)
        return trigger.reply("Devi essere in una chat vocale!")
    VC.join()
        .then(connection => {
            const dispatcher = connection.play(`./audio/${ID}.mp3`, {volume: vol});
            dispatcher.on("end", end => {VC.leave()});
        })
        .catch(console.error);
}

function printMatrix(trigger)
{
    const parameter = trigger.content.replace("!arrigo printMatrix", "").trim().split(" ");
    if(parameter == "")
    {
        replyWith(trigger, "Richiesto parametro! (Matrice in JSON)"); 
        return
    }
    
    try
    {
        const message = formatMatrix(parameter);
        replyWith(trigger, message); 
    } 
    catch 
    {
        replyWith(trigger, "Formato matrice non valido"); 
        return;
    } 

}

function formatMatrix(parameter, parse = true)
{
    let formatMessage = '⌈';
    
    const matrix = parse ? JSON.parse(parameter) : parameter;

    const separators = {
        first  : '\t',
        center : '|\t',
        last   : '⌊\t',
    }
    
    const appendValue = (iteration) => {
        if (iteration == 0)
            return separators.first;

        if (iteration == matrix.length - 1)
            return separators.last;
        
        return separators.center;
    };

    matrix.forEach((row, iterations) => 
    {
        //formatMessage += iterations == 0 ? "\t" : (iterations == matrix.length -1 ? "⌊\t" : "|\t")
        formatMessage += appendValue(iterations);
        for(let el of row)
            formatMessage += el + "\t";
        formatMessage += iterations == 0 ? "⌉\n" : "|\n";
    });

    formatMessage = formatMessage.substring(0, formatMessage.length - 2);
    formatMessage += "⌋"

    

    return formatMessage;
}


function determinant(trigger)
{
    const parameter = trigger.content.replace("!arrigo det", "").trim().split(" ");
    if(parameter == "")
    {
        replyWith(trigger, "Richiesto parametro! (Matrice in JSON)"); 
        return
    }

    const NOTSQUARE = -1;
    try
    {
        const matrix = JSON.parse(parameter);
        const dim = checkDimension(matrix)
        if(dim == NOTSQUARE)
            replyWith(trigger, "Matrice non quadrata");
        else if(dim == 2)
        {
            const x = (matrix[0][0] * matrix[1][1]);
            replyWith(trigger, "Si una differenza delle diagonali\nProdotto diagonale principale = " + x);

            const y = (matrix[0][1] * matrix[1][0]);
            replyWith(trigger, "nProdotto diagonale secondaria = " + y + "\nIl determinante si calcola " + x + "-" + y);
    
            const message = "Il determinante per la matrice: \n" +
                            formatMatrix(parameter) + "\n" + 
                            "Vale " +  (x-y);
            replyWith(trigger, message);
        }
        else if(dim == 3)
        {
            const x1 = (matrix[0][0] * matrix[1][1] * matrix[2][2]);
            const x2 = (matrix[1][0] * matrix[2][1] * matrix[0][2]);
            const x3 = (matrix[2][0] * matrix[0][1] * matrix[1][2]);
            replyWith(trigger, "Regola di Sarrus\nProdotti diagonali principali: x1=" + x1 + "  x2="+ x2 + "  x3="+ x3);
            const y1 = (matrix[0][2] * matrix[1][1] * matrix[2][0]);
            const y2 = (matrix[1][2] * matrix[2][1] * matrix[0][0]);
            const y3 = (matrix[2][2] * matrix[0][1] * matrix[1][0]);
            replyWith(trigger, "Prodotti diagonali secondarie: y1=" + y1 + "  y2="+ y2 + "  y3="+ y3 + "\nSi calcola x1 + x2 + x3 - y1 - y2 - y3");
    
            const message = "Il determinante per la matrice: \n" +
                            formatMatrix(parameter) + "\n" + 
                            "Vale " +  (x1+x2+x3-y1-y2-y3);
            replyWith(trigger, message);
        }
        else if(dim > 3)
        {
            const result = determinantOfMatrix(matrix, dim, true, trigger);
            const message = "Il determinante per la matrice: \n" +
                            formatMatrix(parameter) + "\n" + 
                            "Vale " +  result;
            replyWith(trigger, message);
        }
    } 
    catch (error) 
    {
        console.error(error);
        replyWith(trigger, "Formato matrice non valido"); 
        return;
    }   
}

function checkDimension(matrix)
{
    const dim = matrix.length;
    let valid = true;

    matrix.forEach((row) => {
        if(row.length != dim)
            valid = false;
    });

    return !valid ? -1 : dim;
}

function determinantOfMatrix(matrix, dim, verbose = false, trigger = null)
{
    let result = 0; 

    //  Base case : if matrix contains single element
    if (dim == 1)
        return matrix[0][0];
 
    //int temp[N][N]; // To store cofactors
    let temp = [];
    for(let i = 0; i < dim; i++) {
        temp.push(new Array(dim).fill(0))
    }

    let sign = 1; // To store sign multiplier
    let det = 0;
    
    // Iterate for each element of first row
    for (let f = 0; f < dim; f++) 
    {
        // Getting Cofactor of mat[0][f]
        temp = getCofactor(matrix, 0, f, dim, verbose, trigger);
        det = determinantOfMatrix(temp, dim - 1, verbose, trigger);
    
        // if(verbose)
        //     replyWith(trigger, "Risultato parziale = " + result + "+ (sign=" + (sign > 0 ? '+' : '-') + " * " + det + ")"); 
        result += sign * matrix[0][f] * det; 
 
        // terms are to be added with alternate sign
        sign = -sign;
    }
 
    return result;
}

function getCofactor(matrix, p, q, n, verbose = false, trigger = null)
{
    let i = 0;
    let j = 0;

    let temp = [];
    for(let k = 0; k < n-1; k++) {
        temp.push(new Array(n-1).fill(0))
    }
    
	// Looping for each element of the matrix
	for (let row = 0; row < n; row++)
	{
		for (let col = 0; col < n; col++) 
		{
			// Copying into temporary matrix only those
			// element which are not in given row and
			// column
			if (row != p && col != q) 
			{
				temp[i][j++] = matrix[row][col];

				// Row is filled, so increase row index and
				// reset col index
				if (j == n - 1) 
				{
					j = 0;
					i++;
				}
			}
        }
    }
    // if(verbose)
    //     replyWith(trigger, "fattori matrice tolta riga: " + p + " e colonna: " + q + " :\n" + formatMatrix(temp, false)); 

    return temp;
}

function transpose(trigger)
{
    const parameter = trigger.content.replace("!arrigo transpose", "").trim().split(" ");
    if(parameter == "")
    {
        replyWith(trigger, "Richiesto parametro! (Matrice in JSON)"); 
        return
    }

    try
    {
        const matrix = JSON.parse(parameter);
        const transposed = transposeMatrix(matrix);
        replyWith(trigger, "La trasposta della matrice: \n" +
                            formatMatrix(parameter) + "\n" + 
                            "è\n" +  formatMatrix(transposed, false)); 
    }
    catch (error) 
    {
        console.error(error);
        replyWith(trigger, "Formato matrice non valido"); 
        return;
    }   
}

function transposeMatrix(matrix) 
{
    let [row] = matrix
    return row.map((value, column) => matrix.map(row => row[column]))
}
  
// Function to get adjoint of A[N][N] in adj[N][N]. 
function adjoint(matrix) 
{ 
    const N = matrix.length;
    let adj = [];
    for(let k = 0; k < N; k++) {
        adj.push(new Array(N).fill(0))
    }

    if (N == 1) 
    { 
        adj[0][0] = 1; 
        return; 
    } 
  
    // temp is used to store cofactors of A[][] 
    let sign = 1;
    let temp = [];
    for(let k = 0; k < N; k++) {
        temp.push(new Array(N).fill(0))
    }
  
    for (let i=0; i<N; i++) 
    { 
        for (let j=0; j<N; j++) 
        { 
            // Get cofactor of A[i][j] 
            temp = getCofactor(matrix, i, j, N); 
  
            // sign of adj[j][i] positive if sum of row 
            // and column indexes is even. 
            sign = ((i+j)%2==0)? 1: -1; 
  
            // Interchanging rows and columns to get the 
            // transpose of the cofactor matrix 
            adj[j][i] = (sign)*(determinantOfMatrix(temp, N-1)); 
        } 
    } 
    return adj;
} 

function inverse(trigger, matrix) 
{ 
    const NOTSQUARE = -1;
    const N = checkDimension(matrix)
    if(N == NOTSQUARE)
    {
        replyWith(trigger, "Matrice non quadrata");
        return -1;
    }
    const det = determinantOfMatrix(matrix, N);
    const adj = adjoint(matrix); 

    let inv = [];
    for(let k = 0; k < N; k++) {
        inv.push(new Array(N).fill(0))
    }
  
    // Find Inverse using formula "inverse(A) = adj(A)/det(A)" 
    for (let i=0; i<N; i++) 
        for (let j=0; j<N; j++) 
        {
            const num = adj[i][j]
            const den = det; 
            
            let negatives = 0;
            if(num < 0) negatives++;
            if(det < 0) negatives++;
            let sign = 1;
            
            const denabs = Math.abs(det);
            let numabs = Math.abs(num);
            if(negatives == 1)
                sign = -1;

            inv[i][j] = numabs == denabs ? 1 * sign : (numabs * sign) + "/" + denabs;
        }

    return inv; 
} 


function sendInverse(trigger)
{
    const parameter = trigger.content.replace("!arrigo inverse ", "").trim().split(" ");
    if(parameter == "")
    {
        replyWith(trigger, "Richiesto parametro! (Matrice in JSON)"); 
        return
    }

    try
    {
        const matrix = JSON.parse(parameter);
        const inv = inverse(trigger, matrix);
        if(inv == -1)
            return;
        replyWith(trigger, "L'inversa della matrice: \n" +
                            formatMatrix(parameter) + "\n" + 
                            "è\n" +  formatMatrix(inv, false)); 
    }
    catch (error) 
    {
        console.error(error);
        replyWith(trigger, "Formato matrice non valido"); 
        return;
    }   

}


function rankOfMatrix(trigger) 
{ 
    const parameter = trigger.content.replace("!arrigo rank ", "").trim().split(" ");
    if(parameter == "")
    {
        replyWith(trigger, "Richiesto parametro! (Matrice in JSON)"); 
        return
    }

    try
    {
        const mat = JSON.parse(parameter);

        let result = 0;
        const C = mat.length;
        const R = mat[0].length;
        let rank = C; 
    
        for (let row = 0; row < rank; row++) 
        { 
            if (mat[row][row]) 
            { 
                for (let col = 0; col < R; col++) 
                { 
                    if (col != row) 
                    { 
                        // This makes all entries of current 
                        // column as 0 except entry 'mat[row][row]' 
                        let mult = mat[col][row] / mat[row][row]; 
                        for (let i = 0; i < rank; i++) 
                        mat[col][i] -= mult * mat[row][i]; 
                    } 
                } 
            }  
            else
            { 
                let reduce = true; 
    
                /* Find the non-zero element in current 
                    column  */
                for (let i = row + 1; i < R;  i++) 
                { 
                    // Swap the row with non-zero element 
                    // with this row. 
                    if (mat[i][row]) 
                    { 
                        mat = swap(mat, row, i, rank); 
                        reduce = false; 
                        break ; 
                    } 
                } 
    
                if (reduce) 
                { 
                    rank--; 
                    for (let i = 0; i < R; i ++) 
                        mat[i][row] = mat[i][rank]; 
                } 
    
                row--; 
            } 
    
        } 
        result = rank; 
        replyWith(trigger, "Il rango della matrice: \n" +
                            formatMatrix(parameter) + "\n" + 
                            "è\n" +  result); 
    }
    catch (error) 
    {
        console.error(error);
        replyWith(trigger, "Formato matrice non valido"); 
        return;
    }   
    
} 

function swap(mat, row1, row2, col) 
{ 
    for (let i = 0; i < col; i++) 
    { 
        let temp = mat[row1][i]; 
        mat[row1][i] = mat[row2][i]; 
        mat[row2][i] = temp; 
    } 
    return mat;
} 