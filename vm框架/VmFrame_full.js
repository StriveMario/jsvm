function vmExpression_single_calc(symbol, opNum1) {
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
      return undefined
  }
}
function vmExpression_calc(symbol, opNum2, opNum1) {
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
      return undefined
  }
}




function init_vm() {

  var e = {}

  var instance_run = (function anonymous() {
    function vmExpression(symbol, opNum2, opNum1) {
      //var raw = pthis_Functions("x,y", "return x " + symbol + " y")(opNum1, opNum2)
      var now = vmExpression_calc(symbol, opNum2, opNum1)
      return now
    }
    function vmExpression_single(symbol, opNum) {
      //var raw = pthis_Functions("x", "return " + symbol + "x")(opNum)
      var now = vmExpression_single_calc(symbol, opNum)
      return now
    }

    function vmNewObject(vm_stack, obj_point, argNum) {
      //return (k[argNum] || (k[argNum] = pthis_Functions("x,y", "return new x[y](" + Array(argNum + 1).join(",x[++y]").substr(1) + ")")))(vm_stack, obj_point)
    }
    function vmEnter(codes, argumentss, vars) {
      var n,
        t,
        i,
        s = {}
      b = s.d = vars ? vars.d + 1 : 0;
      for (s["$" + b] = s, t = 0; t < b; t++) {
        s[n = "$" + t] = vars[n];

        //������һ�����ȡ, Ϊ�˼��ݱ��뷽ʽ
        for (i in vars) {
          if (parseInt(i) >= 15 && i.indexOf('$') < 0)
            s[i] = vars[i]
        }

      }

      for (t = 0, b = s.length = argumentss.length; t < b; t++) {
        s[t] = argumentss[t];
      }
      return vmRun(codes, 0, s)
    }
    function vmRun(codes, index, vm_vars) {
      function vm_push(e) {
        vm_stack[vm_esp++] = e
      }
      function vm_substring() {
        g = codes.charCodeAt(index++) - 32
        var str = codes.substring(index, index += g)
        return str
      }
      function call() {
        try {
          y = vmRun(codes, index, vm_vars)
        } catch (e) {
          h = e,
            y = call //�쳣��
        }
      }
      for (var h, y, d, g, vm_stack = [], vm_esp = 0; ;) {
        g = codes.charCodeAt(index++) - 32
        if (Number.isNaN(g)) {
          break
        }
        switch (g) {
          case 1:
            vm_push(!vm_stack[--vm_esp]);

            break;
          case 4:
            vm_stack[vm_esp++] = vm_substring();

            break;
          case 5:
            vm_push(function (e) {
              var a = 0,
                r = e.length; //ȡ����
              return function () {
                var c = a < r; //�жϳ����Ƿ����0
                return c && vm_push(e[a++]), //�����߼���һ��û�з���ֵ�ĺ���, ���һ����undefined
                  c
              }
            }
              (vm_stack[--vm_esp]));

            break;
          case 6:
            y = vm_stack[--vm_esp]
            var func = vm_stack[--vm_esp]
            var result = func(y)
            vm_push(result);

            break;
          case 8: //���ú�������һ�ַ�ʽ
            if (g = codes.charCodeAt(index++) - 32, //ȡ������VM�ֽ���
              call(), //���ú���
              index += g, //����ִ�����, eip+VM�ֽ���
              g = codes.charCodeAt(index++) - 32,
              y === vmRun) //y�Ƿ���ֵ
              index += g;
            else if (y !== call) {

              return y; //����y
            }

            break; //�޷���ֵ
          case 9:
            vm_stack[vm_esp++] = vmRun;

            break;
          case 10:
            vm_push(s(vm_stack[--vm_esp])); //����ִ�в�����, û��s����
            break;
          case 11:
            y = vm_stack[--vm_esp],
              x = vm_stack[--vm_esp],
              vm_push(x + y);

            break;
          case 12:
            for (y = vm_substring(), d = [], g = 0; g < y.length; g++)
              d[g] = y.charCodeAt(g) ^ g + y.length;
            str = String.fromCharCode.apply(null, d)
            vm_push(str);

            break;
          case 13:
            y = vm_stack[--vm_esp],
              obj = vm_stack[--vm_esp][y]

            //h = delete obj;
            break;
          case 14:
            g = codes.charCodeAt(index++) - 32;
            vm_stack[vm_esp++] = g

            break;
          case 59:
            g = codes.charCodeAt(index++) - 32
            var end = vm_esp
            var begin = vm_esp -= g
            ary = g ? vm_stack.slice(begin, end) : []
            vm_push(ary);

            break;
          case 61:
            var temp = vm_stack[--vm_esp][codes.charCodeAt(index++) - 32]
            vm_push(temp)
            //var index = vm_esp - 1;

            break;
          case 62:
            g = vm_stack[--vm_esp]
            vm_vars[0] = 65599 * vm_vars[0] + vm_vars[1].charCodeAt(g) >>> 0;

            break;
          case 65:
            h = vm_stack[--vm_esp],
              y = vm_stack[--vm_esp],
              vm_stack[--vm_esp][y] = h;

            break;
          case 66:
            vm_push(vmExpression(codes[index++], vm_stack[--vm_esp], vm_stack[--vm_esp]));

            break;
          case 67:
            y = vm_stack[--vm_esp]
            d = vm_stack[--vm_esp]
            g = vm_stack[--vm_esp]
            if (g.x === vmRun)
              vm_push(vmEnter(g.y, y, vm_vars))
            else
              vm_push(g.apply(d, y))
            break;
          case 68:
            var symbol;
            g = codes[index++]
            if (g < "<") {
              index--
              symbol = vm_substring()
            } else
              symbol = g + g
            vm_push(vmExpression(symbol, vm_stack[--vm_esp], vm_stack[--vm_esp]));

            break;
          case 70:
            vm_push(!1);

            break;
          case 71:
            vm_stack[vm_esp++] = pthis;

            break;
          case 72:
            vm_stack[vm_esp++] = +vm_substring();

            break;
          case 73:
            vm_push(parseInt(vm_substring(), 36));

            break;
          case 75: //�ж������Ƿ����
            if (vm_stack[--vm_esp]) {
              index++;
              break
            }
          case 74: //������������, ������ѭ�������
            g = codes.charCodeAt(index++) - 32
            g = g << 16 >> 16

            index += g;
            break;
          case 76:
            var vars_idx = codes.charCodeAt(index) - 32;
            //vars_idx = vars_idx);
            vm_push(vm_vars[codes.charCodeAt(index++) - 32]);

            break;
          case 77:
            y = vm_stack[--vm_esp],
              vm_push(vm_stack[--vm_esp][y]);

            break;
          case 78:
            g = codes.charCodeAt(index++) - 32
            vm_push(vmNewObject(vm_stack, vm_esp -= g + 1, g));

            break;
          case 79:
            g = codes.charCodeAt(index++) - 32;
            vm_push(vm_vars["$" + g]);

            break;
          case 81:
            h = vm_stack[--vm_esp]
            str = vm_substring()
            vm_stack[--vm_esp][str] = h;

            break;
          case 82:
            var str = vm_substring();
            vm_push(vm_stack[--vm_esp][str]);

            break;
          case 83:
            h = vm_stack[--vm_esp];
            var vars_idx = codes.charCodeAt(index) - 32;
            vm_vars[codes.charCodeAt(index++) - 32] = h;

            break;
          case 84:
            vm_stack[vm_esp++] = !0;

            break;
          case 85:
            vm_stack[vm_esp++] = void 0;

            break;
          case 86:
            vm_push(vm_stack[vm_esp - 1]);

            break;
          case 88:
            h = vm_stack[--vm_esp],
              y = vm_stack[--vm_esp],
              vm_stack[vm_esp++] = h,
              vm_stack[vm_esp++] = y;

            break;
          case 89:
            vm_push(function () {
              function anonymous_function() {
                return vmEnter(anonymous_function.body_str, arguments, vm_vars)
              }
              return anonymous_function.body_str = vm_substring(),
                anonymous_function.entry = vmRun,
                anonymous_function
            }
              ());

            break;
          case 90:
            vm_stack[vm_esp++] = null;

            break;
          case 91:
            vm_stack[vm_esp++] = h;

            break;
          case 93:
            h = vm_stack[--vm_esp];

            break;
          case 94:
            if (vm_esp >= 1 && vm_stack[vm_esp - 1] != undefined) {
              h = vm_stack[vm_esp - 1];
              var vars_idx = codes.charCodeAt(index) - 32;
              vm_vars[codes.charCodeAt(index++) - 32] = h;

            } else
              index++
            break
          case 95:
            vm_push(parseFloat(vm_substring()));

            break;
          case 96: //
            var a_idx = vm_stack[--vm_esp]
            var ary = vm_stack[--vm_esp]
            vm_push(ary[a_idx]);

            break;
          case 97:
            var a_idx = vm_stack[--vm_esp]
            var ary = vm_stack[--vm_esp]
            var vlaue = vm_stack[--vm_esp]
            ary[a_idx] = vlaue

            break;
          case 98:
            vm_push(vmExpression_single(codes[index++], vm_stack[--vm_esp]));

            break;
          case 99:
            var str = vm_stack[--vm_esp]
            vm_push(global[str])

          case 0:

            return vm_stack[--vm_esp]; //����һ�����ʽ
          default:

            vm_push((g << 16 >> 16) - 16)
        }
      }
    }
    var pthis = global
    //pthis_Functions = pthis.Function
    var s = Object.keys || function (e) {
      var a = {},
        r = 0;
      for (var c in e)
        a[r++] = c;
      return a.length = r,
        a
    }
    var b = {};
    var k = {};
    return vmEnter
  })

  function init() {
    global.console = console;
    global.Date = Date;
    global.String = String;
    global.encodeURIComponent = encodeURIComponent;
    global.decodeURIComponent = decodeURIComponent;
    global.Array = Array;
    global.parseInt = parseInt;
    global.Math = Math;
    global.JSON = JSON;
    instance_run = instance_run()
    instance_run = instance_run(codestr, [e])
  }

  init()

}


init_vm()