from backend.app.analyzers.static_engine import static_engine

def test_java_analyzer_syntax_and_semicolon():
    # Code missing a semicolon on line 4
    code = """
class Solution {
    public int solve() {
        int x = 10
        return x;
    }
}
"""
    diags = static_engine.analyze(code, "java")
    assert len(diags) > 0
    missing_semi = [d for d in diags if "semicolon" in d.message.lower()]
    assert len(missing_semi) > 0
    assert missing_semi[0].line == 4
    assert missing_semi[0].severity == "error"

def test_java_analyzer_boundary_bug():
    # Suspicious boundary `<= arr.length`
    code = """
class Solution {
    public void print(int[] arr) {
        for (int i = 0; i <= arr.length; i++) {
            System.out.println(arr[i]);
        }
    }
}
"""
    diags = static_engine.analyze(code, "java")
    boundary_diags = [d for d in diags if d.category == "boundary"]
    assert len(boundary_diags) > 0
    assert boundary_diags[0].line == 4

def test_python_analyzer_syntax_error():
    # Python code with missing colon on line 2
    code = """
def calculate(a, b)
    return a + b
"""
    diags = static_engine.analyze(code, "python")
    assert len(diags) > 0
    syntax_diags = [d for d in diags if d.category == "syntax"]
    assert len(syntax_diags) > 0
    assert syntax_diags[0].line == 2

def test_python_analyzer_unreachable_code():
    code = """
def solve(n):
    return n * 2
    print("This is unreachable")
"""
    diags = static_engine.analyze(code, "python")
    unreachable = [d for d in diags if "unreachable" in d.message.lower()]
    assert len(unreachable) > 0
    assert unreachable[0].line == 4

def test_cpp_analyzer_missing_semicolon_and_bounds():
    code = """
int main() {
    int val = 42
    for (int i = 0; i <= arr.size(); i++) {
    }
    return 0;
}
"""
    diags = static_engine.analyze(code, "cpp")
    assert len(diags) >= 2
    semi = [d for d in diags if "semicolon" in d.message.lower()]
    assert len(semi) > 0
    assert semi[0].line == 3

def test_javascript_analyzer_brackets_and_assignment():
    code = """
function check(x) {
    if (x = 5) {
        return true;
    }
"""
    diags = static_engine.analyze(code, "javascript")
    assert len(diags) > 0
