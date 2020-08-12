
function my_tostring(obj)
{
    if(obj != undefined)
        return obj.toString()
    else
        return 'undefined'
}

function my_log()
{
    var fs = require("fs");
    var buff = new Buffer(vm_str)
    var array = Array.prototype.slice.call(buff,0);
    fs.writeFileSync('C:/result.txt', array)
}
function vmExpression_single_calc(symbol, opNum1)
{
    switch (symbol) {
        case "!":
            return !opNum1
        case "+":
            return +opNum1
        case "-":
            return -opNum1 
        case "~":
            return ~opNum1
        default:
            console.log('unkown symbol: %s', symbol)
            return undefined
    }
}

function vmExpression_calc(symbol, opNum2, opNum1)
{
    switch (symbol) {
        case "!":
            return !opNum1
        case "*":
            return opNum1 * opNum2
        case "/":
            return opNum1 / opNum2
        case "%":
            return opNum1 % opNum2
        case "+":
            return opNum1 + opNum2
        case "-":
            return opNum1 - opNum2
        case "<<":
            return opNum1 << opNum2
        case ">>":
            return opNum1 >> opNum2
        case ">>>":
            return opNum1 >>> opNum2
        case ">":
            return opNum1 > opNum2
        case "<":
            return opNum1 < opNum2
        case ">=":
            return opNum1 >= opNum2
        case "<=":
            return opNum1 <= opNum2
        case "==":
            return opNum1 == opNum2
        case "===":
            return opNum1 === opNum2
        case "!==":
            return opNum1 !== opNum2
        case "!=":
            return opNum1 != opNum2
        case "&":
            return opNum1 & opNum2
        case "~":
            return ~opNum
        case "^":
            return opNum1 ^ opNum2
        case "|":
            return opNum1 | opNum2
        case "&&":
            return opNum1 && opNum2
        case "||":
            return opNum1 || opNum2
        case "=":
            return opNum1 = opNum2
        case "*=":
            return opNum1 *= opNum2
        case "/=":
            return opNum1 /= opNum2
        case "%=":
            return opNum1 %= opNum2
        case "&=":
            return opNum1 &= opNum2
        case "+=":
            return opNum1 += opNum2
        case "-=":
            return opNum1 -= opNum2
        case "<<=":
            return opNum1 <<= opNum2
        case ">>=":
            return opNum1 >>= opNum2
        case "^=":
            return opNum1 ^= opNum2
        case "|=":
            return opNum1 ^= opNum2
        default:
            console.log('unkown symbol: %s', symbol)
            return undefined
    }
}


function generateSignature(userId) {
    this.navigator = {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1"
    }
    var e = {}

    var instance_run = (function anonymous() {
        function vmExpression(symbol, opNum2, opNum1) {
            console.log("\t==Expression: %s %s %s", my_tostring(opNum1), my_tostring(symbol), my_tostring(opNum2));
            var raw = pthis_Functions("x,y", "return x " + symbol + " y")(opNum1, opNum2)
            var now = vmExpression_calc(symbol, opNum2, opNum1)
            if(raw != now)
                console.log("raw: %s,  now: %s", raw, now)
            return raw
            //return (b[symbol] || (b[symbol] = pthis_Functions("x,y", "return x " + symbol + " y")))(opNum1, opNum2)
        }
        function vmExpression_single(symbol, opNum) {
            console.log("\t==Expression_single: %s %s",  my_tostring(symbol), my_tostring(opNum));
            var raw = pthis_Functions("x", "return "  + symbol + "x")(opNum)
            var now = vmExpression_single_calc(symbol, opNum)
            if(raw != now)
                console.log("raw: %s,  now: %s", raw, now)
            return raw
            //return (b[symbol] || (b[symbol] = pthis_Functions("x", "return "  + symbol + "x")))(opNum)
        }

        function vmNewObject(vm_stack, obj_point, argNum) {
            console.log("\t==NewObject: %s", my_tostring(vm_stack[obj_point]));
            return (k[argNum] || (k[argNum] = pthis_Functions("x,y", "return new x[y](" + Array(argNum + 1).join(",x[++y]").substr(1) + ")")))(vm_stack, obj_point)
        }
        function vmEnter(codes, arguments, vars) {
            console.log('vmEnter');
            var n, t, i, s = {}
            b = s.d = vars ? vars.d + 1 : 0;
            for (s["$" + b] = s, t = 0; t < b; t++)
            {
                s[n = "$" + t] = vars[n];
                
                //拷贝上一层变量取, 为了兼容编译方式
                for(i in vars)
                {
                    if(parseInt(i) >= 15 && i.indexOf('$') < 0)
                        s[i] = vars[i]
                }

            }
                
            for (t = 0, b = s.length = arguments.length; t < b; t++)
            {
                s[t] = arguments[t];
            }
            return vmRun(codes, 0, s)
        }
        function vmRun(codes, index, vm_vars) {
            console.log('vmRun');
            function vm_push(e) {
                vm_stack[vm_esp++] = e
            }
            function vm_substring() {
                 g = codes.charCodeAt(index++) - 32
                 var str = codes.substring(index, index += g)
                 //var str = byteToString(stringToByte(codes).slice(index, index += g))
                 return str
            }
            function call() {
                try {
                    y = vmRun(codes, index, vm_vars)
                } catch (e) {
                    h = e,
                    y = call //异常了
                }
            }
            for (var h, y, d, g, vm_stack = [], vm_esp = 0; ; ){
                g = codes.charCodeAt(index++) - 32
                if(Number.isNaN(g)){break}
                console.log('g = %s', my_tostring(g));
                    switch (g) {
                    case 1:
                        vm_push(!vm_stack[--vm_esp]);
                        console.log('PUSH !(stack top)');
                        break;
                    case 4:
                        vm_stack[vm_esp++] = vm_substring();
                        console.log('PUSH vm_substring', );
                        break;
                    case 5:
                        vm_push(function(e) {
                            var a = 0
                            , r = e.length; //取长度
                            return function() {
                                var c = a < r; //判断长度是否等于0
                                return c && vm_push(e[a++]), //这里逻辑与一个没有返回值的函数, 结果一定是undefined
                                c
                            }
                        }(vm_stack[--vm_esp]));
                        console.log('PUSH undefined');
                        break;
                    case 6:
                        y = vm_stack[--vm_esp]
                        var func = vm_stack[--vm_esp]
                        var result = func(y)
                        vm_push(result);
                        console.log('PUSH func result {function: %s , arg : %s  result : %s}', func ? my_tostring(func) : "undefine", my_tostring(y), result);
                        break;
                    case 8://调用函数的另一种方式
                        if (g = codes.charCodeAt(index++) - 32, //取出函数VM字节数
                        call(),//调用函数
                        index += g,//这里执行完毕, eip+VM字节数
                        g = codes.charCodeAt(index++) - 32,
                        y === vmRun) //y是返回值
                            index += g;
                        else if (y !== call)
                        {
                            console.log('call function result: %s', my_tostring(y));
                            return y;//返回y
                        }
                        console.log('call function exception');
                        break; //无返回值
                    case 9: 
                        vm_stack[vm_esp++] = vmRun;
                        console.log('PUSH vmRun');
                        break;
                    case 10:
                        vm_push(s(vm_stack[--vm_esp]));//这里执行不成立, 没有s函数
                        break;
                    case 11:
                        y = vm_stack[--vm_esp],
                        x = vm_stack[--vm_esp],
                        vm_push(x + y);
                        console.log('PUSH  {%s + %s , result = %s}', x, y, x + y);
                        break;
                    case 12:
                        for (y = vm_substring(),d = [],g = 0; g < y.length; g++)
                            d[g] = y.charCodeAt(g) ^ g + y.length;
                        str = String.fromCharCode.apply(null, d)
                        vm_push(str);
                        console.log('XOR DECODE { result = %s}', str); 
                        break;
                    case 13:
                        y = vm_stack[--vm_esp],
                        obj = vm_stack[--vm_esp][y]
                        console.log('DLETE OBJECT {obj:%s type:%s}',my_tostring(obj), typeof(obj)); 
                        h = delete obj;
                        break;
                    case 14:
                        g = codes.charCodeAt(index++) - 32;
                        vm_stack[vm_esp++] = g
                        console.log('PUSH Vlaue{ obj:%s type:%s}', my_tostring(g), typeof(g)); 
                        break;
                    case 59:
                        g = codes.charCodeAt(index++) - 32
                        end = vm_esp
                        begin = vm_esp -= g
                        ary = g ? vm_stack.slice(begin, end) : []
                        vm_push(ary);
                        console.log('PUSH STACK ARRAY { begin: %s, end: %s, result: %s  type: %s}', my_tostring(begin), my_tostring(end), my_tostring(ary), typeof(ary));
                        break;
                    case 61:
                        var temp = vm_stack[--vm_esp][codes.charCodeAt(index++) - 32]
                        vm_push(temp)
                        //var index = vm_esp - 1;
                        console.log('PUSH [ESP-1][g] = %s', temp ? my_tostring(temp) : "undefine");
                        break;
                    case 62:
                        g = vm_stack[--vm_esp]
                        vm_vars[0] = 65599 * vm_vars[0] + vm_vars[1].charCodeAt(g) >>> 0;
                        console.log("vm_vars[0] = 65599 * vm_vars[0] + vm_vars[1].charCodeAt(vm_stack[--vm_esp]) >>> 0, result : %s", my_tostring(vm_vars[0]));
                        break;
                    case 65:
                        h = vm_stack[--vm_esp],
                        y = vm_stack[--vm_esp],
                        vm_stack[--vm_esp][y] = h;
                        console.log('SET_OBJECT2 {dest:%s obj:%s type:%s}',  my_tostring(y), my_tostring(h.toString), typeof(h));
                        break;
                    case 66:
                        vm_push(vmExpression(codes[index++], vm_stack[--vm_esp], vm_stack[--vm_esp]));
                        console.log('PUSH expr {obj:%s type:%s}', my_tostring((vm_stack[vm_esp-1])), typeof((vm_stack[vm_esp-1])))
                        break;
                    case 67:
                        y = vm_stack[--vm_esp]
                        d = vm_stack[--vm_esp]
                        g = vm_stack[--vm_esp]
                        if(g.x === vmRun)
                            vm_push(vmEnter(g.y, y, vm_vars))
                        else
                            vm_push(g.apply(d, y))
                        //vm_push((g = vm_stack[--vm_esp]).x === vmRun ? vmEnter(g.y, y, vm_vars) : g.apply(d, y));
                        console.log('APPLY [ESP]');
                        break;
                    case 68:
                        var symbol;
                        g = codes[index++]
                        if(g < "<")
                        {
                            index--
                            symbol =vm_substring()
                        }
                        else
                            symbol = g + g
                        vm_push(vmExpression(symbol, vm_stack[--vm_esp], vm_stack[--vm_esp]));
                        console.log('PUSH expr_2 {obj:%s type:%s}', my_tostring((vm_stack[vm_esp-1])), typeof((vm_stack[vm_esp-1])));
                        break;
                    case 70:
                        vm_push(!1);
                        console.log('PUSH 0');
                        break;
                    case 71:
                        vm_stack[vm_esp++] = pthis;
                        console.log('PUSH pthis {obj:%s type:%s}', my_tostring((vm_stack[vm_esp-1])), typeof((vm_stack[vm_esp-1])));
                        break;
                    case 72:
                        vm_stack[vm_esp++] = +vm_substring();
                        console.log('PUSH STR {obj:%s type:%s}', my_tostring((vm_stack[vm_esp-1])), typeof((vm_stack[vm_esp-1])))
                        break;
                    case 73:
                        vm_push(parseInt(vm_substring(), 36));
                        console.log('PUSH INT {obj:%s type:%s}', my_tostring((vm_stack[vm_esp-1])), typeof((vm_stack[vm_esp-1])))
                        break;
                    case 75: //判断条件是否成立
                        if (vm_stack[--vm_esp]) {
                            index++;
                            break
                        }
                    case 74: //不成立则跳过, 或用于循环代码块
                        g = codes.charCodeAt(index++) - 32
                        g = g << 16 >> 16
                        console.log('IDX+=%s', my_tostring(g))
                        index += g;
                        break;
                    case 76:
                        var vars_idx = codes.charCodeAt(index) - 32;
                        //vars_idx = vars_idx);
                        vm_push(vm_vars[codes.charCodeAt(index++) - 32]);
                        console.log('PUSH Vars[%s] {obj:%s type:%s}',my_tostring( vars_idx), my_tostring(vm_vars[vars_idx]), typeof((vm_vars[vars_idx])))
                        break;
                    case 77:
                        y = vm_stack[--vm_esp],
                        vm_push(vm_stack[--vm_esp][y]);
                        console.log('PUSH_OBJECT {obj:%s type:%s}', my_tostring((vm_stack[vm_esp-1])), typeof((vm_stack[vm_esp-1])))
                        break;
                    case 78:
                        g = codes.charCodeAt(index++) - 32
                        vm_push(vmNewObject(vm_stack, vm_esp -= g + 1, g));
                        console.log('NEW_OBJECT {obj:%s type:%s}', my_tostring((vm_stack[vm_esp-1])), typeof((vm_stack[vm_esp-1])))
                        break;
                    case 79:
                        g = codes.charCodeAt(index++) - 32;
                        vm_push(vm_vars["$" + g]);
                        console.log('PUSH Vars_2[%s]', my_tostring(g));
                        break;
                    case 81:
                        h = vm_stack[--vm_esp]
                        str = vm_substring()
                        vm_stack[--vm_esp][str] = h;
                        console.log('SET_OBJECT {dest:%s obj:%s type:%s}', str, my_tostring(h), typeof(h));
                        break;
                    case 82:
                        var str = vm_substring();
                        vm_push(vm_stack[--vm_esp][str]);
                        console.log("GET_OBJECT {dest:%s obj:%s type:%s}", str, vm_stack[vm_esp-1]? my_tostring((vm_stack[vm_esp-1])):'undefine', typeof(vm_stack[vm_esp-1]));
                        break;
                    case 83:
                        h = vm_stack[--vm_esp];
                        var vars_idx = codes.charCodeAt(index) - 32;
                        vm_vars[codes.charCodeAt(index++) - 32] = h;
                        console.log('MOV Vars[%s], v {v:%s type:%s}', my_tostring(vars_idx), my_tostring(h), typeof(h));
                        break;
                    case 84:
                        vm_stack[vm_esp++] = !0;
                        console.log('PUSH 1');
                        break;
                    case 85:
                        vm_stack[vm_esp++] = void 0;
                        console.log('PUSH void 0');
                        break;
                    case 86:
                        vm_push(vm_stack[vm_esp - 1]);
                        console.log('PUSH [ESP] {esp:%s type:%s}', my_tostring((vm_stack[vm_esp - 1])), typeof(vm_stack[vm_esp - 1]));
                        break;
                    case 88:
                        h = vm_stack[--vm_esp],
                        y = vm_stack[--vm_esp],
                        vm_stack[vm_esp++] = h,
                        vm_stack[vm_esp++] = y;
                        console.log('SWAP h,y {h:%s type:%s y:%s type:%s}', my_tostring(h), typeof(h), my_tostring(y), typeof(y));
                        break;
                    case 89:
                        vm_push(function() {
                            function anonymous_function() {
                                console.log('function enter');
                                return vmEnter(anonymous_function.body_str, arguments, vm_vars)
                            }
                            return anonymous_function.body_str = vm_substring(),
                            anonymous_function.entry = vmRun,
                            anonymous_function
                        }());
                        console.log('PUSH anonymous_function');
                        break;
                    case 90:
                        vm_stack[vm_esp++] = null;
                        console.log('PUSH null');
                        break;
                    case 91:
                        vm_stack[vm_esp++] = h;
                        console.log('PUSH h (h:%s type:%s)',my_tostring(h), typeof(h));
                        break;
                    case 93:
                        h = vm_stack[--vm_esp];
                        console.log('POP h (h:%s type:%s)',my_tostring(h), typeof(h));
                        break;
                    case 94:
                        if(vm_esp >= 1 && vm_stack[vm_esp-1] != undefined)
                        {
                            h = vm_stack[vm_esp-1];
                            var vars_idx = codes.charCodeAt(index) - 32;
                            vm_vars[codes.charCodeAt(index++) - 32] = h;
                            console.log('MY_MOV Vars[%s], v {v:%s type:%s}', vars_idx, h, typeof(h));
                        }
                        else
                            index++
                        break
                    case 95:
                        vm_push(parseFloat(vm_substring()));
                        console.log('PUSH FLOAT {obj:%s type:%s}', my_tostring((vm_stack[vm_esp-1])), typeof((vm_stack[vm_esp-1])))
                        break;
                    case 96://
                        var a_idx = vm_stack[--vm_esp]
                        var ary = vm_stack[--vm_esp]
                        vm_push(ary[a_idx]);
                        console.log('PUSH ARRAY VALUE {obj:%s type:%s}', my_tostring((vm_stack[vm_esp-1])), typeof((vm_stack[vm_esp-1])))
                        break;
                    case 97:
                        var a_idx = vm_stack[--vm_esp]
                        var ary = vm_stack[--vm_esp]
                        var vlaue = vm_stack[--vm_esp]
                        ary[a_idx] = vlaue
                        console.log('SET ARRAY VALUE {obj:%s index:%s vlaue:%s}', my_tostring(ary), my_tostring(a_idx), my_tostring(vlaue))
                        break;
                    case 98:
                        vm_push(vmExpression_single(codes[index++], vm_stack[--vm_esp]));
                        console.log('PUSH expr {obj:%s type:%s}', my_tostring((vm_stack[vm_esp-1])), typeof((vm_stack[vm_esp-1])))
                        break;
                    case 99:
                        var str = vm_stack[--vm_esp]
                        vm_push(global[str])
                        console.log('SET GLOBAL VALUE {obj:%s type:%s}', my_tostring((vm_stack[vm_esp-1])), typeof((vm_stack[vm_esp-1])))
                    case 0:
                        console.log('RETURN [ESP] {obj:%s type:%s}', (vm_stack[vm_esp-1])? my_tostring((vm_stack[vm_esp-1])):"undefine", typeof(vm_stack[vm_esp-1]));
                        return vm_stack[--vm_esp]; //结束一个表达式
                    default:
                        console.log('PUSH %s', my_tostring(((g << 16 >> 16) - 16)))
                        vm_push((g << 16 >> 16) - 16)
                    }
            }
        }
        var pthis = this
        pthis_Functions = pthis.Function
        s = Object.keys || function(e) {
            var a = {}
              , r = 0;
            for (var c in e)
                a[r++] = c;
            return a.length = r,
            a
        }
        b = {};
        k = {};
        return vmEnter
    }
    )

    instance_run = instance_run()
    //instance_run = instance_run('gr$Daten Иb/s!l y͒yĹg,(lfi~ah`{mv,-n|jqewVxp{rvmmx,&effkx[!cs"l".Pq%widthl"@q&heightl"vr*getContextx$"2d[!cs#l#,*;?|u.|uc{uq$fontl#vr(fillTextx$$龘ฑภ경2<[#c}l#2q*shadowBlurl#1q-shadowOffsetXl#$$limeq+shadowColorl#vr#arcx88802[%c}l#vr&strokex[ c}l"v,)}eOmyoZB]mx[ cs!0s$l$Pb<k7l l!r&lengthb%^l$1+s$jl  s#i$1ek1s$gr#tack4)zgr#tac$! +0o![#cj?o ]!l$b%s"o ]!l"l$b*b^0d#>>>s!0s%yA0s"l"l!r&lengthb<k+l"^l"1+s"jl  s&l&z0l!$ +["cs\'(0l#i\'1ps9wxb&s() &{s)/s(gr&Stringr,fromCharCodes)0s*yWl ._b&s o!])l l Jb<k$.aj;l .Tb<k$.gj/l .^b<k&i"-4j!+& s+yPo!]+s!l!l Hd>&l!l Bd>&+l!l <d>&+l!l 6d>&+l!l &+ s,y=o!o!]/q"13o!l q"10o!],l 2d>& s.{s-yMo!o!]0q"13o!]*Ld<l 4d#>>>b|s!o!l q"10o!],l!& s/yIo!o!].q"13o!],o!]*Jd<l 6d#>>>b|&o!]+l &+ s0l-l!&l-l!i\'1z141z4b/@d<l"b|&+l-l(l!b^&+l-l&zl\'g,)gk}ejo{cm,)|yn~Lij~em["cl$b%@d<l&zl\'l $ +["cl$b%b|&+l-l%8d<@b|l!b^&+ q$sign ', [e])
    //instance_run = instance_run('.$s i!fi!2b*l i!2b/b+i!2b-i!1b-s!l!i!2b*s" ', [e])
    //instance_run = instance_run('.%s y)l i!2b+s!s"y s#l"zl s l .*s l ["c', [e])
    //instance_run = instance_run('.+s l i!ab<k$.*s l i!ad"==k$.+s .,s ', [e])
    //instance_run = instance_run('.*s . s!l!i!ab<k3l i!1b+s .!l!b+s!j ', [e])
    //instance_run = instance_run('y|. s"l!i!ab%i!5b>k&l s"j5l!i!ad"==k&.!s"j$.*s". s#l#i!ab<kBl"l i"2sb*i!5b/b+i!2b+s".!l#b+s#j￵s$l$z.ès l .s l ["c', [e])
    //instance_run = instance_run('.$s/./."l/b+b*.".".!b-b-b/s0.!l0b+s0', [e])


    //读取bytes
    // var fs = require("fs");
    // var data = fs.readFileSync('C:/result.txt');
    // var bytes_ary = data.toString()
    // bytes_ary = bytes_ary.split(',')
    // for(var i = 0; i < bytes_ary.length; i++)
    // {
    //     bytes_ary[i] = parseInt(bytes_ary[i])
    // } 
    // var iconv = require('iconv-lite');
    //console.log(iconv.decode(new Buffer(bytes),'UTF-8'))
    //instance_run = instance_run(iconv.decode(new Buffer(bytes_ary),'UTF-8'), [e])


    var iconv = require('iconv-lite');
    var bytes_ary = [46,43,115,47,108,47,46,42,98,60,107,38,46,42,115,47,106,52,108,47,46,42,100,34,61,61,107,38,46,43,115,47,106,36,46,44,115,47]
    instance_run = instance_run(iconv.decode(new Buffer(bytes_ary),'UTF-8'), [e])

    //return e.sign(userId)
}

// // 7 
// var a = 70 + 16//7 >> 16 << 16 + 16
// console.log('PUSH %s', ((a << 16 >> 16) - 16).toString())
// console.log(String.fromCharCode(a))
//console.log(parseInt('10', 36))
// num = 36
//console.log(num.toString(36))
//console.log('i#123i#255b* '.substring(5, 8))
str = generateSignature("71158571905");
console.log(str)
