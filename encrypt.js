//运算优先级/变量存放
//var code = 'var c = 4; \n var answer= 0xf * (2 + c) / (2 - (2 - 1)); {var a = answer++; a += 3} '
////简单函数调用
//var code = 'var d = 5; \n function test1(a, c) { var b = 2 + a; return b; } \n function test2() { return 2 + 3; }  \n test1(10, d) '
//if else流程控制
//var code  = 'var a = 11; if(a < 10){a = 10; }else if (a == 10){ a = 11;} else{ a = 12;}'
// For循环流程控制
//var code  = 'var a = 10; for(var i = 0; i < 10; i++){a = a + 1}'
//数组寻址
//var code  = 'var a=[1,2]; var b = 1; var c = a[b]'
//三目运算符
//var code  = 'var i = 99 ? "0123456789ABCDEF" : "0123456789abcdef" ; console.log(i)'

var code = 'var a = 11; if(a < 10){a = 10; }else if (a == 10){ a = 11;} else{ a = 12;}'


//test
//var code = 'var e = [1,2]; var t = "999"; var i = 0; e[i >> 5] |= (255 & t.charCodeAt(i / 8)) << 24 - i % 32;'
//var code = 'this["aaa"] = 3; this.aaa = 4'
//var code = 'var e = [1,2]; e[0] |= 3'

//var code = 'this.sign == undefined || this.sign == 0'
//var code = 'var a = 1; if(a != 1 || a == undefined ){a = 2}; console.log(a)'

// var code = "function replaceAll(text = 1, olds, news){\
//   var t = text;\
//   for(var i = 0; i < text.length; i++)\
//   {\
//     if(text[i] == olds)\
//     {\
//       t = t.replace(olds, news)\
//     }\
//   }\
//   return t\
// }\
//   \
//   replaceAll(\"333\", \"1\", \"2\")\
//   "



//未解决
//var code = 'function test1(a, c) { var b = 2 + a; return b; }; \n var i = "12345"; i.length > 16 && (i = test1(i.length, 8 * t.length));'
//var code  = 'var a = 9; if(a < 10 && a > 5 && a < 50 && a > 1){ a = 10; } console.log(a)'
//var code  = 'var a = 9; a < 10 && a > 5 && a < 50 && a > 1'

function saveFunction(stmt)
{
    //console.log(stmt.type);
    if(stmt.type == 'Program')
    {
        for(var i in stmt['body'])
        {
            if(stmt['body'][i].type == 'FunctionDeclaration')
                console.log(stmt['body'][i].type)
        }
    }
}



function parseTree(text)
{
    //语法词法分析成AST树
    const esprima = require('esprima');
    const ast = esprima.parseScript(text);
    //console.log(ast);
    
    //saveFunction(ast)

    //解析AST树成JS代码
    const escodegen = require("escodegen");
    const transformCode = escodegen.generate(ast)
    //console.log('over');

}


var fs = require("fs");
var data = fs.readFileSync("./用于测试加密的算法/CRC.js");
parseTree(data.toString());
//parseTree(code);
